<template>
  <div class="file-editor">
    <div v-if="!activeTab" class="editor-empty">
      <div class="editor-empty-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </div>
      <p>从左侧文件树选择文件打开</p>
    </div>
    <div ref="editorContainer" class="monaco-container" v-show="activeTab"></div>

    <div v-if="activeTab" class="mini-status">
      <span class="ms-branch">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
        main
      </span>
      <span class="ms-item">{{ cursorLabel }}</span>
      <span class="ms-right">
        <span class="ms-item">空格: 2</span>
        <span class="ms-item">UTF-8</span>
        <span class="ms-item">LF</span>
        <span class="ms-item">{{ langLabel }}</span>
        <span v-if="activeTab.dirty" class="ms-item dirty">● 未保存</span>
      </span>
    </div>
  </div>
</template>

<script>
import monaco, { getLanguage, getLanguageLabel, ensureExtraLanguages } from './monacoLanguage'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

export default {
  name: 'DesktopFileEditor',
  inject: ['fileManager'],
  data() {
    return {
      editor: null,
      models: {},
      cursorLabel: 'Ln 1, Col 1',
      langLabel: '纯文本',
      modelSubscriptions: []
    }
  },
  computed: {
    activeTab() {
      return this.fileManager.state.tabs.find(t => t.path === this.fileManager.state.activePath) || null
    },
    activePath() {
      return this.fileManager.state.activePath
    },
    tabsLength() {
      return this.fileManager.state.tabs.length
    }
  },
  watch: {
    activePath: {
      handler() {
        this.syncModel()
      }
    },
    tabsLength() {
      this.cleanupModels()
      this.syncModel()
    }
  },
  mounted() {
    ensureExtraLanguages()
    this.initEditor()
  },
  beforeDestroy() {
    this.modelSubscriptions.forEach(entry => {
      try {
        entry.sub.dispose()
      } catch (e) {}
    })
    this.modelSubscriptions = []
    Object.values(this.models).forEach(m => m.dispose())
    this.models = {}
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }
  },
  methods: {
    initEditor() {
      if (this.editor) return
      if (!this.$refs.editorContainer) return
      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: '',
        language: 'plaintext',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        scrollbar: { useShadows: false, vertical: 'auto', horizontal: 'auto' }
      })

      this.editor.onDidChangeCursorPosition(() => {
        this.updateCursor()
      })

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.save()
      })

      this.syncModel()
    },

    getOrCreateModel(tab) {
      if (!this.models[tab.path]) {
        const model = monaco.editor.createModel(tab.content || '', getLanguage(tab.path))
        this.models[tab.path] = model
        const sub = model.onDidChangeContent(() => {
          const t = this.fileManager.state.tabs.find(x => x.path === tab.path)
          if (!t) return
          t.content = model.getValue()
          t.dirty = t.content !== t.savedContent
        })
        this.modelSubscriptions.push({ path: tab.path, sub })
      } else if (this.models[tab.path].getLanguageId() !== getLanguage(tab.path)) {
        monaco.editor.setModelLanguage(this.models[tab.path], getLanguage(tab.path))
      }
      return this.models[tab.path]
    },

    syncModel() {
      if (!this.editor) return
      this.cleanupModels()
      const tab = this.activeTab
      if (!tab) {
        this.editor.setModel(null)
        this.cursorLabel = 'Ln 1, Col 1'
        this.langLabel = '纯文本'
        return
      }
      const model = this.getOrCreateModel(tab)
      this.editor.setModel(model)
      this.langLabel = getLanguageLabel(tab.path)
      this.updateCursor()
    },

    updateCursor() {
      if (!this.editor) return
      const pos = this.editor.getPosition()
      this.cursorLabel = pos ? `Ln ${pos.lineNumber}, Col ${pos.column}` : 'Ln 1, Col 1'
    },

    cleanupModels() {
      const openPaths = new Set(this.fileManager.state.tabs.map(t => t.path))
      this.modelSubscriptions = this.modelSubscriptions.filter(entry => {
        if (!openPaths.has(entry.path)) {
          try {
            entry.sub.dispose()
          } catch (e) {}
          return false
        }
        return true
      })
      Object.keys(this.models).forEach(p => {
        if (!openPaths.has(p)) {
          try {
            this.models[p].dispose()
          } catch (e) {}
          delete this.models[p]
        }
      })
    },

    save() {
      this.fileManager.saveActive()
    },

    layout() {
      if (this.editor) {
        this.$nextTick(() => this.editor.layout())
      }
    }
  }
}
</script>

<style scoped>
.file-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.editor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  user-select: none;
}
.editor-empty-icon {
  opacity: 0.3;
  margin-bottom: 12px;
}
.editor-empty p {
  font-size: 13px;
}
.monaco-container {
  flex: 1;
  overflow: hidden;
}
.mini-status {
  height: 24px;
  min-height: 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-titlebar);
  border-top: 1px solid var(--border);
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}
.ms-branch {
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 4px;
}
.ms-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}
.ms-item {
  cursor: pointer;
  transition: color 0.15s;
}
.ms-item:hover {
  color: var(--text-primary);
}
.ms-item.dirty {
  color: var(--yellow);
  font-weight: 500;
}
</style>
