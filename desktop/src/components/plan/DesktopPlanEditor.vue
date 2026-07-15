<template>
  <div class="plan-editor-panel" :style="{ flex: editorFlex }">
    <div class="plan-editor-header">
      <div class="plan-editor-header-left">
        <span class="file-icon">📄</span>
        <span class="file-path">{{ filePath }}</span>
      </div>
      <div class="plan-editor-actions">
        <button title="保存方案 (Ctrl+S)" @click="toggleEdit">✓</button>
        <button title="刷新方案" @click="refresh">↻</button>
        <button title="导出方案" @click="$emit('export')">⬇</button>
        <button title="新建子方案" @click="$emit('create-sub')">+</button>
      </div>
    </div>
    <div class="plan-editor-body">
      <div v-if="!editing" class="plan-editor-preview" v-html="previewHtml"></div>
      <textarea
        v-else
        class="plan-textarea"
        v-model="content"
        placeholder="编写方案文档..."
      ></textarea>
    </div>
    <div class="plan-editor-footer">
      <span>{{ editing ? '✎ 编辑中' : '✓ Markdown' }}</span>
      <span>|</span>
      <span>UTF-8</span>
      <span>|</span>
      <span>行: {{ lineCount }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopPlanEditor',
  props: {
    content: { type: String, default: '' },
    filePath: { type: String, default: '方案文档.md' },
    editorFlex: { type: String, default: '1' }
  },
  data() {
    return {
      editing: false
    }
  },
  computed: {
    lineCount() {
      return this.content.split('\n').length
    },
    previewHtml() {
      return this.renderMarkdown(this.content)
    }
  },
  methods: {
    toggleEdit() {
      this.editing = !this.editing
      if (!this.editing) {
        this.$emit('update:content', this.content)
      }
    },
    refresh() {
      this.editing = false
      this.$emit('refresh')
    },
    renderMarkdown(text) {
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/((?:<li>.*?<\/li><br>?)+)/g, (m) => '<ul>' + m.replace(/<br>/g, '') + '</ul>')
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
.plan-editor-preview h1 {
  font-size: 19px;
  font-weight: 700;
  margin: 14px 0 6px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
}
.plan-editor-preview h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 5px;
  color: var(--text-primary);
}
.plan-editor-preview h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 10px 0 4px;
}
.plan-editor-preview p { margin: 5px 0; line-height: 1.7; }
.plan-editor-preview ul { padding-left: 20px; margin: 4px 0; }
.plan-editor-preview ol { padding-left: 20px; margin: 4px 0; }
.plan-editor-preview li { margin: 2px 0; }
.plan-editor-preview code {
  background: #f1f2f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.plan-editor-preview pre {
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
</style>
