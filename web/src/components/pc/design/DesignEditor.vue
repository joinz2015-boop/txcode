<template>
  <div class="flex flex-col h-full">
    <div v-if="!fileName" class="flex-1 flex items-center justify-center text-textMuted">
      <div class="text-center">
        <i class="fa-solid fa-file-code text-6xl mb-4 opacity-20 block"></i>
        <p>双击左侧 HTML 文件编辑</p>
      </div>
    </div>
    <div ref="editorContainer" class="monaco-editor-container flex-1" v-show="fileName"></div>
    <div v-if="fileName" class="h-8 bg-sidebar border-t border-border flex items-center justify-between px-3 shrink-0">
      <div class="flex items-center gap-4 text-xs text-textMuted">
        <span>{{ fileName }}</span>
        <span v-if="contentChanged" class="text-yellow-500">已修改</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="saveFile"
          :disabled="!contentChanged || saving"
          class="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i v-if="saving" class="fa-solid fa-spinner fa-spin mr-1"></i>
          <i v-else class="fa-solid fa-save mr-1"></i>
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import * as monaco from 'monaco-editor'
import { api } from '../../../api/index.js'

export default {
  name: 'DesignEditor',
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
        if (this.editor && this.fileName) {
          this.originalContent = val || ''
          this.editor.setValue(this.originalContent)
          this.contentChanged = false
        }
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

      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: this.fileContent || '',
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        scrollbar: { useShadows: false, vertical: 'auto', horizontal: 'auto' }
      })

      this.originalContent = this.fileContent || ''

      this.editor.onDidChangeModelContent(() => {
        if (this.editor) {
          this.contentChanged = this.editor.getValue() !== this.originalContent
          this.$emit('content-changed', this.contentChanged)
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
    },
    layout() {
      if (this.editor) {
        this.$nextTick(() => this.editor.layout())
      }
    },
    async saveFile() {
      if (!this.editor || !this.filePath) return
      this.saving = true
      try {
        const content = this.editor.getValue()
        await api.writeFile(this.filePath, content)
        this.originalContent = content
        this.contentChanged = false
        this.$emit('content-saved', content)
        this.$emit('content-changed', false)
        this.$message.success('文件已保存')
      } catch (e) {
        console.error('Save failed:', e)
        this.$message.error('保存文件失败')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.monaco-editor-container { width: 100%; overflow: hidden; }
.monaco-editor-container >>> .monaco-editor { padding-top: 8px; }
.monaco-editor-container >>> .monaco-editor .overflow-guard { overflow: hidden !important; }
</style>
