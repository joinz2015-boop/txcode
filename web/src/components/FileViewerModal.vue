<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-sidebar border border-border rounded-lg w-[90%] h-[80%] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-border">
        <div class="flex items-center gap-2">
          <span
            v-if="fileStatus"
            class="text-xs font-bold px-1.5 py-0.5 rounded"
            :class="statusClass"
          >
            {{ statusCode }}
          </span>
          <span class="text-white text-sm">{{ filePath }}</span>
        </div>
        <button @click="close" class="text-gray-400 hover:text-white">
          <i class="fa-solid fa-times text-lg"></i>
        </button>
      </div>
      <div class="flex-1 overflow-hidden bg-[#1e1e1e]">
        <div  ref="editorContainer" class="w-full h-full"></div>
      </div>
      <div class="h-8 bg-sidebar border-t border-border flex items-center justify-between px-3">
        <div class="flex items-center gap-4 text-xs text-gray-400">
          <span>{{ fullPath }}</span>
          <span v-if="hasChanges" class="text-yellow-500">已修改</span>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="save" 
            :disabled="!hasChanges || saving"
            class="px-3 py-1 text-xs bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
          >
            <i v-if="saving" class="fa-solid fa-spinner fa-spin mr-1"></i>
            <i v-else class="fa-solid fa-save mr-1"></i>
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'
import * as monaco from 'monaco-editor'

const origError = console.error
console.error = (...args) => {
  if (args[0]?.toString().includes('toUrl')) return
  origError(...args)
}

export default {
  name: 'FileViewerModal',
  data() {
    return {
      visible: false,
      fullPath: '',
      fileStatus: null,
      loading: false,
      saving: false,
      editor: null,
      originalContent: ''
    }
  },
  computed: {
    filePath() {
      if (!this.fullPath) return ''
      const parts = this.fullPath.split('/')
      return parts[parts.length - 1]
    },
    hasChanges() {
      if (!this.editor) return false
      return this.editor.getValue() !== this.originalContent
    },
    statusCode() {
      if (!this.fileStatus) return ''
      return this.fileStatus.statusCode || ''
    },
    statusClass() {
      if (!this.fileStatus) return 'bg-gray-600 text-white'
      const classes = {
        modified: 'bg-blue-600 text-white',
        added: 'bg-green-600 text-white',
        deleted: 'bg-red-600 text-white',
        untracked: 'bg-gray-600 text-white',
        renamed: 'bg-purple-600 text-white'
      }
      return classes[this.fileStatus.status] || 'bg-gray-600 text-white'
    }
  },
  beforeDestroy() {
    this.destroyEditor()
  },
  methods: {
    async open(filePath, fileStatus = null) {
      this.fullPath = filePath
      this.fileStatus = fileStatus
      this.visible = true
      this.loading = true

      try {
        const res = await api.getFileContent(filePath)
        this.originalContent = res.content || ''
        
        this.$nextTick(() => {
          this.initEditor(this.originalContent)
        })
      } catch (e) {
        console.error('Failed to load file:', e)
        this.$message.error('加载文件失败')
      } finally {
        this.loading = false
      }
    },
    close() {
      this.visible = false
    },
    async save() {
      if (!this.fullPath || !this.hasChanges) return
      
      this.saving = true
      try {
        await api.writeFile(this.fullPath, this.editor.getValue())
        this.originalContent = this.editor.getValue()
        this.$message.success('文件已保存')
      } catch (e) {
        console.error('Save file failed:', e)
        this.$message.error('保存文件失败')
      } finally {
        this.saving = false
      }
    },
    initEditor(content) {
      console.log("-----------initEditor called with content length:", content.length)
      if (!this.$refs.editorContainer) return
      console.log("-----------initEditor called with content length:aaaa", content.length)

      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: content || '',
        language: this.getLanguage(),
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        scrollbar: {
          useShadows: false,
          vertical: 'auto',
          horizontal: 'auto'
        }
      })

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.save()
      })
    },
    destroyEditor() {
      if (this.editor) {
        this.editor.dispose()
        this.editor = null
      }
    },
    getLanguage() {
      const ext = this.filePath.split('.').pop().toLowerCase()
      const langMap = {
        'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css',
        'vue': 'html', 'py': 'python', 'md': 'markdown', 'json': 'json',
        'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml', 'sql': 'sql',
        'sh': 'shell', 'go': 'go', 'rs': 'rust', 'java': 'java',
        'cpp': 'cpp', 'c': 'c', 'jsx': 'javascript', 'tsx': 'typescript'
      }
      return langMap[ext] || 'plaintext'
    }
  }
}
</script>
