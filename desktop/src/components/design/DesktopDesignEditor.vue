<template>
  <div class="design-editor">
    <div v-if="!fileName" class="editor-empty">
      <div class="editor-empty-icon">📝</div>
      <p>双击左侧 HTML 文件编辑</p>
    </div>
    <div ref="editorContainer" class="monaco-container" v-show="fileName"></div>
    <div v-if="fileName" class="editor-footer">
      <div class="editor-footer-left">
        <span>{{ fileName }}</span>
        <span v-if="contentChanged" class="modified-tag">已修改</span>
      </div>
      <div class="editor-footer-right">
        <button @click="$emit('refresh')" class="editor-btn" title="刷新内容">↻</button>
        <button @click="saveFile" :disabled="!contentChanged || saving" class="editor-btn save-btn">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import * as monaco from 'monaco-editor'
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
  name: 'DesktopDesignEditor',
  props: {
    fileContent: { type: String, default: '' },
    fileName: { type: String, default: '' },
    filePath: { type: String, default: '' }
  },
  data() {
    return {
      editor: null,
      originalContent: '',
      contentChanged: false,
      saving: false
    }
  },
  watch: {
    fileContent: {
      immediate: true,
      handler(val) {
        if (!this.fileName) return
        if (!this.editor) {
          this.initEditor()
          if (!this.editor) return
        }
        const newVal = val || ''
        if (this.editor.getValue() === newVal) return
        this.originalContent = newVal
        this.editor.setValue(newVal)
        this.contentChanged = false
        this.$emit('content-changed', false)
      }
    }
  },
  mounted() {
    this.$nextTick(() => this.initEditor())
  },
  beforeDestroy() {
    if (this.editor) { this.editor.dispose(); this.editor = null }
  },
  methods: {
    initEditor() {
      if (this.editor) return
      if (!this.$refs.editorContainer) return
      if (!this.fileName) return

      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: this.fileContent || '',
        language: 'html',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        scrollbar: { useShadows: false, vertical: 'auto', horizontal: 'auto' }
      })

      this.originalContent = this.fileContent || ''

      this.editor.onDidChangeModelContent(() => {
        if (this.editor) {
          const changed = this.editor.getValue() !== this.originalContent
          this.contentChanged = changed
          this.$emit('content-changed', changed)
        }
      })

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveFile()
      })
    },

    updateContent(content) {
      if (!this.editor) { this.initEditor(); this.$nextTick(() => this.updateContent(content)); return }
      this.originalContent = content
      this.editor.setValue(content)
      this.contentChanged = false
      this.$emit('content-changed', false)
    },

    layout() {
      if (!this.editor && this.fileName) {
        this.initEditor()
      }
      if (this.editor) {
        this.$nextTick(() => this.editor.layout())
      }
    },

    async saveFile() {
      if (!this.editor || !this.filePath) return
      this.saving = true
      try {
        const content = this.editor.getValue()
        const { writeFile } = await import('@/api/index')
        await writeFile(this.filePath, content)
        this.originalContent = content
        this.contentChanged = false
        this.$emit('content-changed', false)
        this.$emit('content-saved', content)
      } catch (e) {
        alert('保存文件失败: ' + (e.message || e))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.design-editor { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.editor-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; color: var(--text-muted);
}
.editor-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.3; }

.monaco-container { flex: 1; width: 100%; overflow: hidden; }

.editor-footer {
  display: flex; align-items: center; justify-content: space-between;
  height: 32px; padding: 0 12px; background: var(--bg-titlebar);
  border-top: 1px solid var(--border); flex-shrink: 0;
}
.editor-footer-left { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); }
.modified-tag { color: #e6a817; font-weight: 500; }
.editor-footer-right { display: flex; align-items: center; gap: 4px; }
.editor-btn {
  padding: 3px 10px; font-size: 11px; border-radius: 4px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); cursor: pointer; font-family: inherit;
}
.editor-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.editor-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.editor-btn.save-btn { background: var(--accent); color: #fff; border-color: var(--accent); }
.editor-btn.save-btn:hover { background: #4752c4; }
.editor-btn.save-btn:disabled { background: #c5c5d0; border-color: #c5c5d0; }
</style>
