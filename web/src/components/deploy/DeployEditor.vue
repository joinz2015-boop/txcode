<template>
  <div class="editor-panel">
    <div class="editor-header">
      <i class="fa-solid fa-file-lines"></i>
      <span>{{ displayPath }}</span>
      <span class="save-status" :class="saved ? 'saved' : ''">
        {{ saved ? '已保存' : '未保存' }}
      </span>
    </div>
    <div class="editor-container" ref="editorContainer"></div>
  </div>
</template>

<script>
import * as monaco from 'monaco-editor'
import { api } from '../../api'

export default {
  name: 'DeployEditor',
  props: {
    content: { type: String, default: '' },
    filePath: { type: String, default: '' }
  },
  data() {
    return {
      editor: null,
      saved: true
    }
  },
  computed: {
    displayPath() {
      return this.filePath || 'RELEASE.md'
    }
  },
  watch: {
    content(val) {
      if (this.editor && val !== this.editor.getValue()) {
        this.editor.setValue(val)
        this.saved = true
      }
    }
  },
  mounted() {
    this.$nextTick(() => this.initEditor())
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }
  },
  methods: {
    initEditor() {
      if (this.editor) return
      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: this.content || '',
        language: 'markdown',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16 }
      })
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.save()
      })
      this.editor.onDidChangeModelContent(() => {
        this.saved = false
        this.$emit('content-change', this.editor.getValue())
      })
    },
    getContent() {
      return this.editor ? this.editor.getValue() : this.content
    },
    async save() {
      if (!this.editor || !this.filePath) return
      const content = this.editor.getValue()
      try {
        await api.writeFile(this.filePath, content)
        this.saved = true
        this.$emit('saved', content)
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    }
  }
}
</script>

<style scoped>
.editor-panel {
  flex: 1;
  min-width: 300px;
  background: #121212;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.editor-header {
  background: #121212;
  border-bottom: 1px solid #1e1e1e;
  padding: 12px 16px;
  font-size: 13px;
  color: #84848a;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.save-status {
  margin-left: auto;
  font-size: 12px;
  color: #f59e0b;
}
.save-status.saved {
  color: #22c55e;
}
.editor-container {
  flex: 1;
  min-height: 0;
}
</style>
