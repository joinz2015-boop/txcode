<template>
  <div class="plan-editor-panel" :style="{ flex: editorFlex }">
    <div class="plan-editor-header">
      <div class="plan-editor-header-left">
        <span class="file-icon">📄</span>
        <span class="file-path">{{ filePath }}</span>
      </div>
      <div class="plan-editor-actions">
        <button title="保存方案 (Ctrl+S)" @click="saveContent">✓</button>
        <button title="刷新方案" @click="refresh">↻</button>
        <button title="导出方案" @click="$emit('export')">⬇</button>
        <button title="新建子方案" @click="$emit('create-sub')">+</button>
      </div>
    </div>
    <div class="plan-editor-body">
      <textarea
        ref="textareaEl"
        class="plan-textarea"
        v-model="localContent"
        placeholder="编写方案文档..."
      ></textarea>
      <button class="generate-code-fab" title="生成代码" @click="$emit('generate-code')">生成代码</button>
    </div>
    <div class="plan-editor-footer">
      <span>✓ Markdown</span>
      <span>|</span>
      <span>UTF-8</span>
      <span>|</span>
      <span>行: {{ lineCount }}</span>
      <span v-if="saving">| 保存中...</span>
    </div>
  </div>
</template>

<script>
import { readPlan, savePlan, getFileContent, writeFile } from '@/api/index'

export default {
  name: 'DesktopPlanEditor',
  props: {
    filePath: { type: String, default: '方案文档.md' },
    folderName: { type: String, default: '' },
    planFilePath: { type: String, default: '' },
    editorFlex: { type: String, default: '1' }
  },
  data() {
    return {
      localContent: '',
      saving: false,
      _loadKey: 0
    }
  },
  computed: {
    lineCount() {
      return this.localContent ? this.localContent.split('\n').length : 0
    }
  },
  watch: {
    folderName: {
      handler(val) {
        if (val) this.loadContent()
      },
      immediate: true
    },
    planFilePath: {
      handler(val) {
        if (val) this.loadContent()
      }
    }
  },
  methods: {
    async loadContent() {
      if (this.planFilePath) {
        this.loadFromPath(this.planFilePath)
        return
      }
      if (!this.folderName) {
        this.localContent = ''
        return
      }
      try {
        const r = await readPlan(this.folderName)
        this.localContent = (r.data && r.data.content) || ''
      } catch (e) {
        console.error('加载方案失败:', e)
        this.localContent = ''
      }
    },
    async loadFromPath(path) {
      try {
        const r = await getFileContent(path)
        this.localContent = (r.data && r.data.content) || r.data || ''
      } catch (e) {
        console.error('加载方案文件失败:', e)
        this.localContent = ''
      }
    },
    async saveContent() {
      if (!this.folderName && !this.planFilePath) return
      this.saving = true
      try {
        if (this.folderName) {
          await savePlan(this.folderName, this.localContent)
        } else if (this.planFilePath) {
          await writeFile(this.planFilePath, this.localContent)
        }
        this.$emit('update:content', this.localContent)
      } catch (e) {
        console.error('保存方案失败:', e)
        alert('保存失败: ' + e.message)
      } finally {
        this.saving = false
      }
    },
    refresh() {
      this._loadKey++
      this.loadContent()
    },
    getValue() {
      return this.localContent
    },
    escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }
}
</script>

<style scoped>
.plan-editor-panel {
  display: flex;
  flex-direction: column;
  min-width: 200px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.plan-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-titlebar);
  font-size: 12px;
  flex-shrink: 0;
}
.plan-editor-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
}
.file-icon { font-size: 14px; }
.file-path {
  font-size: 11.5px;
  color: var(--text-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plan-editor-actions {
  display: flex;
  gap: 1px;
}
.plan-editor-actions button {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;
}
.plan-editor-actions button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.plan-editor-body {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
  position: relative;
}
.plan-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
  background: transparent;
}
.plan-textarea::placeholder {
  color: var(--text-muted);
}
.plan-editor-preview :deep(h1) {
  font-size: 19px;
  font-weight: 700;
  margin: 14px 0 6px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
}
.plan-editor-preview :deep(h2) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 5px;
  color: var(--text-primary);
}
.plan-editor-preview :deep(h3) {
  font-size: 14px;
  font-weight: 600;
  margin: 10px 0 4px;
}
.plan-editor-preview :deep(p) { margin: 5px 0; line-height: 1.7; }
.plan-editor-preview :deep(ul) { padding-left: 20px; margin: 4px 0; }
.plan-editor-preview :deep(ol) { padding-left: 20px; margin: 4px 0; }
.plan-editor-preview :deep(li) { margin: 2px 0; }
.plan-editor-preview :deep(code) {
  background: #f1f2f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.plan-editor-preview :deep(pre) {
  background: #f1f2f6;
  border-radius: 6px;
  padding: 10px 14px;
  overflow-x: auto;
  margin: 8px 0;
  border: 1px solid #e5e5ea;
}
.plan-editor-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-titlebar);
}

.generate-code-fab {
  position: absolute;
  bottom: 16px;
  right: 16px;
  height: 40px;
  padding: 0 18px;
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.35);
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}
.generate-code-fab:hover {
  background: #6366f1;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(79, 110, 247, 0.45);
}
</style>
