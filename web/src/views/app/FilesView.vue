<template>
  <div class="h-full flex flex-col bg-[#1e1e1e]">
    <div class="bg-sidebar border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <button @click="goUp" :disabled="!browseResult.parent_path && browseResult.parent_path !== ''" class="p-2 text-textMuted hover:text-white disabled:opacity-30">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <button @click="goHome" class="p-2 text-textMuted hover:text-white">
          <i class="fa-solid fa-home"></i>
        </button>
      </div>
      <div class="text-sm text-white truncate max-w-[50%]">{{ currentDirName }}</div>
      <button @click="toggleMenu" class="p-2 text-textMuted hover:text-white">
        <i class="fa-solid fa-ellipsis-v"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="flex flex-col items-center justify-center h-full text-textMuted">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
        <span class="text-sm">加载中...</span>
      </div>
      <div v-else-if="fileTreeData.length === 0" class="flex flex-col items-center justify-center h-full text-textMuted">
        <i class="fa-solid fa-folder-open text-4xl mb-2 opacity-30"></i>
        <span class="text-sm">此目录为空</span>
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="node in fileTreeData"
          :key="node.path"
          @click="handleItemClick(node)"
          class="flex items-center px-4 py-3 active:bg-active"
        >
          <i :class="getItemIcon(node)" class="text-lg w-8 text-center"></i>
          <span class="flex-1 text-sm text-white ml-2 truncate">{{ node.name }}</span>
          <i v-if="node.is_directory" class="fa-solid fa-chevron-right text-textMuted text-xs"></i>
        </div>
      </div>
    </div>

    <div v-if="contextMenu.visible" class="fixed inset-0 bg-black/50 z-50" @click="hideContextMenu">
      <div class="absolute bottom-0 left-0 right-0 bg-sidebar rounded-t-xl p-4" @click.stop>
        <div class="w-12 h-1 bg-gray-500 rounded-full mx-auto mb-4"></div>
        <div class="space-y-1">
          <button v-if="contextMenu.target?.is_directory" @click="createNewFile" class="w-full flex items-center gap-3 px-4 py-3 text-white text-sm active:bg-active rounded-lg">
            <i class="fa-solid fa-file-lines w-5"></i> 新建文件
          </button>
          <button v-if="contextMenu.target?.is_directory" @click="createNewFolder" class="w-full flex items-center gap-3 px-4 py-3 text-white text-sm active:bg-active rounded-lg">
            <i class="fa-solid fa-folder-plus w-5"></i> 新建文件夹
          </button>
          <button @click="copyPath" class="w-full flex items-center gap-3 px-4 py-3 text-white text-sm active:bg-active rounded-lg">
            <i class="fa-solid fa-copy w-5"></i> 复制路径
          </button>
          <button v-if="!contextMenu.target?.is_directory" @click="openFileItem" class="w-full flex items-center gap-3 px-4 py-3 text-white text-sm active:bg-active rounded-lg">
            <i class="fa-solid fa-folder-open w-5"></i> 打开文件
          </button>
          <button @click="renameItem" class="w-full flex items-center gap-3 px-4 py-3 text-white text-sm active:bg-active rounded-lg">
            <i class="fa-solid fa-pen w-5"></i> 重命名
          </button>
          <button @click="deleteItem" class="w-full flex items-center gap-3 px-4 py-3 text-red-400 text-sm active:bg-active rounded-lg">
            <i class="fa-solid fa-trash w-5"></i> 删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="inputDialog.visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="cancelInput">
      <div class="w-full max-w-sm bg-sidebar border border-border rounded-xl p-4">
        <p class="text-white text-base mb-4">{{ inputDialog.title }}</p>
        <input
          ref="dialogInput"
          v-model="inputDialog.value"
          @keyup.enter="confirmInput"
          @keyup.escape="cancelInput"
          class="w-full px-4 py-3 bg-[#1e1e1e] border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent"
          :placeholder="inputDialog.placeholder"
        />
        <div class="flex gap-3 mt-4">
          <button @click="cancelInput" class="flex-1 py-3 text-textMuted text-sm rounded-lg">取消</button>
          <button @click="confirmInput" class="flex-1 py-3 bg-accent text-white text-sm rounded-lg">确定</button>
        </div>
      </div>
    </div>

    <div v-if="fileViewerVisible" class="fixed inset-0 bg-[#1e1e1e] z-50 flex flex-col">
      <div class="bg-sidebar border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <button @click="closeFileViewer" class="p-2 text-textMuted hover:text-white">
          <i class="fa-solid fa-times"></i>
        </button>
        <span class="text-sm text-white truncate max-w-[50%]">{{ editingFileName }}</span>
        <button @click="saveFile" :disabled="!hasChanges || saving" class="p-2 text-accent disabled:opacity-50">
          <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-save"></i>
        </button>
      </div>
      <div v-if="fileLoading" class="flex-1 flex items-center justify-center text-textMuted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
      <div v-else-if="isBinary" class="flex-1 flex items-center justify-center text-textMuted">
        <div class="text-center">
          <i class="fa-solid fa-file text-4xl mb-4 opacity-30"></i>
          <p>二进制文件无法预览</p>
        </div>
      </div>
      <div v-else ref="editorContainer" class="flex-1 monaco-editor-container"></div>
      <div v-if="hasChanges && !isBinary" class="bg-yellow-600/20 border-t border-yellow-600/30 px-4 py-2 text-yellow-500 text-sm text-center">
        文件已修改，Ctrl+S 保存
      </div>
    </div>

    <div v-if="confirmDialog.visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="w-full max-w-sm bg-sidebar border border-border rounded-xl p-4">
        <p class="text-white text-base mb-4">{{ confirmDialog.message }}</p>
        <div class="flex gap-3">
          <button @click="cancelConfirm" class="flex-1 py-3 text-textMuted text-sm rounded-lg">取消</button>
          <button @click="confirmDelete" class="flex-1 py-3 bg-red-500 text-white text-sm rounded-lg">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../api'
import * as monaco from 'monaco-editor'

export default {
  name: 'AppFilesView',
  data() {
    return {
      browseResult: {
        current_path: '',
        parent_path: null,
        items: []
      },
      loading: false,
      contextMenu: { visible: false, target: null },
      inputDialog: { visible: false, title: '', value: '', placeholder: '', type: '', target: null },
      confirmDialog: { visible: false, message: '', target: null },
      fileViewerVisible: false,
      editingFileName: '',
      editingFilePath: '',
      fileLoading: false,
      saving: false,
      isBinary: false,
      editor: null,
      originalContent: '',
      fileIcons: {
        js: 'fa-brands fa-js text-yellow-400',
        ts: 'fa-brands fa-js text-blue-400',
        html: 'fa-brands fa-html5 text-orange-500',
        css: 'fa-brands fa-css3 text-blue-400',
        json: 'fa-solid fa-file-code text-yellow-300',
        yaml: 'fa-solid fa-file-code text-blue-300',
        yml: 'fa-solid fa-file-code text-blue-300',
        md: 'fa-solid fa-file-lines text-gray-400',
        py: 'fa-brands fa-python text-blue-500',
        vue: 'fa-brands fa-vuejs text-green-400',
        sh: 'fa-solid fa-terminal text-green-400',
        go: 'fa-brands fa-golang text-cyan-400'
      }
    }
  },
  computed: {
    fileTreeData() {
      const items = this.browseResult.items.map(item => this.transformNode(item))
      return items.sort((a, b) => {
        if (a.is_directory === b.is_directory) {
          return a.name.localeCompare(b.name)
        }
        return a.is_directory ? -1 : 1
      })
    },
    currentDirName() {
      const path = this.browseResult.current_path
      if (!path) return '我的电脑'
      return path.split(/[/\\]/).pop() || path
    },
    hasChanges() {
      if (!this.editor) return false
      return this.editor.getValue() !== this.originalContent
    },
    isBinaryFile() {
      return this.isBinary
    }
  },
  async created() {
    await this.browse('')
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown)
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }
  },
  methods: {
    async browse(path) {
      this.loading = true
      try {
        const res = await api.browseFilesystem(path)
        this.browseResult = res.data
      } catch (e) {
        console.error('Browse failed:', e)
      } finally {
        this.loading = false
      }
    },
    transformNode(node) {
      return {
        name: node.name,
        path: node.path,
        is_directory: node.is_directory,
        is_drive: node.is_drive || false,
        size: node.size,
        is_binary: node.is_binary || false
      }
    },
    handleItemClick(node) {
      if (node.is_directory) {
        this.browse(node.path)
      } else {
        this.openFileViewer(node)
      }
    },
    toggleMenu() {
      this.$message.info('长安文件可进行更多操作')
    },
    async openFileItem() {
      this.hideContextMenu()
      if (this.contextMenu.target) {
        this.openFileViewer(this.contextMenu.target)
      }
    },
    goUp() {
      if (!this.browseResult.parent_path && this.browseResult.parent_path !== '') return
      const parentPath = this.browseResult.parent_path === '' ? '' : this.browseResult.parent_path
      this.browse(parentPath)
    },
    goHome() {
      this.browse('')
    },
    async openFileViewer(node) {
      this.fileViewerVisible = true
      this.editingFileName = node.name
      this.editingFilePath = node.path
      this.fileLoading = true
      this.isBinary = node.is_binary
      this.editor = null

      if (node.is_binary) {
        this.fileLoading = false
        return
      }

      try {
        const res = await api.getFileContent(node.path)
        const isBinary = res.is_binary || false
        this.isBinary = isBinary
        this.$nextTick(() => {
          if (isBinary || !this.$refs.editorContainer) return
          
          if (!this.editor) {
            this.editor = monaco.editor.create(this.$refs.editorContainer, {
              value: '',
              language: 'plaintext',
              theme: 'vs-dark',
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 16,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              lineNumbers: 'on'
            })
            this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              this.saveFile()
            })
          }
          if (this.editor) {
            const content = res.content || ''
            const language = this.getLanguageFromFilename(node.name)
            const model = monaco.editor.createModel(content, language)
            this.editor.setModel(model)
            this.originalContent = content
          }
        })
      } catch (e) {
        console.error('Load file failed:', e)
      } finally {
        this.fileLoading = false
      }
    },
    closeFileViewer() {
      if (this.hasChanges) {
        this.$confirm('文件已修改，是否保存？', '提示', {
          confirmButtonText: '保存',
          cancelButtonText: '不保存',
          type: 'warning'
        }).then(() => {
          this.saveFile()
          this.fileViewerVisible = false
        }).catch(() => {
          this.fileViewerVisible = false
        })
      } else {
        this.fileViewerVisible = false
      }
    },
    async saveFile() {
      if (!this.editor || this.saving) return

      this.saving = true
      try {
        const content = this.editor.getValue()
        await api.writeFile(this.editingFilePath, content)
        this.originalContent = content
        this.$message.success('已保存')
      } catch (e) {
        console.error('Save failed:', e)
        this.$message.error('保存失败')
      } finally {
        this.saving = false
      }
    },
    initEditor() {
      if (this.editor || !this.$refs.editorContainer) return

      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: '',
        language: 'plaintext',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 16,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on'
      })

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveFile()
      })
    },
    showContextMenu(e, node) {
      e.stopPropagation()
      this.contextMenu = { visible: true, target: node }
    },
    hideContextMenu() {
      this.contextMenu.visible = false
    },
    copyPath() {
      this.hideContextMenu()
      if (this.contextMenu.target) {
        navigator.clipboard.writeText(this.contextMenu.target.path)
        this.$message.success('路径已复制')
      }
    },
    createNewFile() {
      this.hideContextMenu()
      this.inputDialog = {
        visible: true,
        title: '新建文件',
        value: '',
        placeholder: '输入文件名',
        type: 'file',
        target: this.contextMenu.target
      }
      this.$nextTick(() => {
        this.$refs.dialogInput?.focus()
      })
    },
    createNewFolder() {
      this.hideContextMenu()
      this.inputDialog = {
        visible: true,
        title: '新建文件夹',
        value: '',
        placeholder: '输入文件夹名',
        type: 'folder',
        target: this.contextMenu.target
      }
      this.$nextTick(() => {
        this.$refs.dialogInput?.focus()
      })
    },
    renameItem() {
      this.hideContextMenu()
      this.inputDialog = {
        visible: true,
        title: '重命名',
        value: this.contextMenu.target.name,
        placeholder: '输入新名称',
        type: 'rename',
        target: this.contextMenu.target
      }
      this.$nextTick(() => {
        this.$refs.dialogInput?.focus()
        this.$refs.dialogInput?.select()
      })
    },
    async confirmInput() {
      const { type, value, target } = this.inputDialog
      if (!value.trim()) {
        this.cancelInput()
        return
      }

      try {
        const separator = target.path.includes('\\') ? '\\' : '/'
        if (type === 'file') {
          const newPath = target.path + separator + value.trim()
          await api.writeFile(newPath, '')
        } else if (type === 'folder') {
          const newPath = target.path + separator + value.trim()
          await api.createDirectory(newPath)
        } else if (type === 'rename') {
          const parentPath = target.path.substring(0, target.path.lastIndexOf(separator))
          const newPath = parentPath + separator + value.trim()
          await api.renameFile(target.path, value.trim())
        }
        this.browse(this.browseResult.current_path)
      } catch (e) {
        console.error('Operation failed:', e)
        this.$message.error('操作失败')
      }

      this.inputDialog.visible = false
    },
    cancelInput() {
      this.inputDialog.visible = false
    },
    deleteItem() {
      this.hideContextMenu()
      this.confirmDialog = {
        visible: true,
        message: `确定要删除 "${this.contextMenu.target.name}" 吗？`,
        target: this.contextMenu.target
      }
    },
    cancelConfirm() {
      this.confirmDialog.visible = false
    },
    async confirmDelete() {
      try {
        await api.deleteFile(this.confirmDialog.target.path)
        this.$message.success('删除成功')
        this.browse(this.browseResult.current_path)
      } catch (e) {
        console.error('Delete failed:', e)
        this.$message.error('删除失败')
      }
      this.confirmDialog.visible = false
    },
    handleKeydown(e) {
      if (e.ctrlKey && e.key === 's' && this.fileViewerVisible) {
        e.preventDefault()
        this.saveFile()
      }
    },
    getItemIcon(node) {
      if (node.is_directory) {
        return 'fa-solid fa-folder text-blue-400'
      }
      const ext = node.name.split('.').pop().toLowerCase()
      const name = node.name.toLowerCase()
      if (name === 'dockerfile') return 'fa-brands fa-docker text-blue-400'
      if (name === '.gitignore') return 'fa-brands fa-git text-red-400'
      return this.fileIcons[ext] || 'fa-solid fa-file text-gray-400'
    },
    getLanguageFromFilename(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const langMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'html': 'html',
        'css': 'css',
        'vue': 'html',
        'py': 'python',
        'md': 'markdown',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'sh': 'shell',
        'go': 'go',
        'rs': 'rust'
      }
      return langMap[ext] || 'plaintext'
    }
  }
}
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
}
</style>