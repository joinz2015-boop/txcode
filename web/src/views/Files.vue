<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="bg-sidebar border-r border-border flex flex-col shrink-0" :style="{ width: sidebarWidth + 'px' }">
      <div class="flex border-b border-border text-xs uppercase font-bold text-textMuted">
        <div class="px-4 py-2 border-b-2 border-accent text-white flex items-center gap-2">
          <i class="fa-solid fa-folder-open"></i>
          Explorer
        </div>
      </div>
      
      <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button @click="goUp" :disabled="!browseResult.parent_path && browseResult.parent_path !== ''" class="p-1 text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="上级目录">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button @click="refresh" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
        <button @click="goHome" class="p-1 text-textMuted hover:text-white" title="我的电脑">
          <i class="fa-solid fa-home"></i>
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto py-1 sidebar-scroll">
        <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="fileTreeData.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
          此目录为空
        </div>
        <file-tree-node
          v-else
          v-for="node in fileTreeData"
          :key="node.path"
          :node="node"
          :level="0"
          :selected-path="selectedPath"
          @select="handleSelect"
          @open-file="openFile"
          @load-children="handleLoadChildren"
          @contextmenu="showContextMenu"
        />
      </div>

      <div
        v-show="contextMenu.visible"
        class="fixed bg-sidebar border border-border rounded shadow-lg py-1 z-50 min-w-[160px]"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <template v-if="contextMenu.target?.is_directory">
          <button @click="copyPath" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-copy text-xs"></i> 复制路径
          </button>
          <button @click="createNewFile" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-file-lines text-xs"></i> 新建文件
          </button>
          <button @click="createNewFolder" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-folder-plus text-xs"></i> 新建文件夹
          </button>
          <div class="border-t border-border my-1"></div>
          <button @click="renameItem" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-pen text-xs"></i> 重命名
          </button>
          <button @click="deleteItem" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-trash text-xs"></i> 删除
          </button>
        </template>
        <template v-else>
          <button @click="copyPath" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-copy text-xs"></i> 复制路径
          </button>
          <button @click="renameItem" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-pen text-xs"></i> 重命名
          </button>
          <button @click="deleteItem" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-active flex items-center gap-2">
            <i class="fa-solid fa-trash text-xs"></i> 删除
          </button>
        </template>
      </div>

      <div
        v-show="inputDialog.visible"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="cancelInput"
      >
        <div class="bg-sidebar border border-border rounded p-4 w-80">
          <p class="text-white text-sm mb-3">{{ inputDialog.title }}</p>
          <input
            ref="renameInput"
            v-model="inputDialog.value"
            @keyup.enter="confirmInput"
            @keyup.escape="cancelInput"
            class="w-full px-3 py-2 bg-[#1e1e1e] border border-border rounded text-white text-sm focus:outline-none focus:border-accent"
            :placeholder="inputDialog.placeholder"
          />
          <div class="flex justify-end gap-2 mt-4">
            <button @click="cancelInput" class="px-3 py-1 text-xs text-textMuted hover:text-white">取消</button>
            <button @click="confirmInput" class="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-blue-600">确定</button>
          </div>
        </div>
      </div>
    </aside>

    <div class="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors" @mousedown="startResize"></div>

    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div class="flex border-b border-border bg-sidebar overflow-x-auto">
        <div
          v-for="file in openFiles"
          :key="file.path"
          @click="activeFile = file"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-border"
          :class="activeFile?.path === file.path ? 'bg-[#1e1e1e] text-white border-t-2 border-t-accent' : 'text-textMuted hover:bg-[#2a2a2a]'"
        >
          <i :class="getFileIcon(file.name)" class="text-xs"></i>
          <span class="text-xs">{{ file.name }}</span>
          <button @click.stop="closeFile(file)" class="ml-2 hover:text-white text-textMuted">
            <i class="fa-solid fa-times text-[10px]"></i>
          </button>
        </div>
      </div>
      
      <div class="flex-1 overflow-hidden">
        <div v-if="!activeFile" class="text-textMuted text-center mt-20">
          <i class="fa-solid fa-file-code text-6xl mb-4 opacity-20"></i>
          <p>双击左侧文件打开编辑器</p>
        </div>
        
        <div v-else-if="fileLoading" class="flex items-center justify-center h-full text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        
        <div v-else-if="isBinaryFile" class="flex items-center justify-center h-full text-textMuted">
          <div class="text-center">
            <i class="fa-solid fa-file text-4xl mb-4 opacity-30"></i>
            <p>二进制文件无法预览</p>
          </div>
        </div>
        
        <div v-show="activeFile && !isBinaryFile" ref="editorContainer" class="monaco-editor-container"></div>
      </div>
      
      <div v-if="activeFile && !isBinaryFile" class="h-8 bg-sidebar border-t border-border flex items-center justify-between px-3">
        <div class="flex items-center gap-4 text-xs text-textMuted">
          <span>{{ activeFile.path }}</span>
          <span v-if="hasChanges" class="text-yellow-500">已修改</span>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="saveFile" 
            :disabled="!hasChanges || saving"
            class="px-3 py-1 text-xs bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
          >
            <i v-if="saving" class="fa-solid fa-spinner fa-spin mr-1"></i>
            <i v-else class="fa-solid fa-save mr-1"></i>
            保存
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import FileTreeNode from '../components/FileTreeNode.vue'
import { api } from '../api'
import * as monaco from 'monaco-editor'

export default {
  name: 'Files',
  components: { FileTreeNode },
  data() {
    return {
      browseResult: {
        current_path: '',
        parent_path: null,
        items: []
      },
      selectedPath: '',
      selectedItem: null,
      fileContent: null,
      loading: false,
      expandedPaths: new Set(),
      openFiles: [],
      activeFile: null,
      fileLoading: false,
      saving: false,
      editor: null,
      originalContent: '',
      sidebarWidth: 260,
      isResizing: false,
      contextMenu: { visible: false, x: 0, y: 0, target: null },
      inputDialog: { visible: false, title: '', value: '', placeholder: '', type: '', target: null },
      fileIcons: {
        js: 'fa-brands fa-js text-yellow-400',
        ts: 'fa-brands fa-js text-blue-400',
        html: 'fa-brands fa-html5 text-orange-500',
        css: 'fa-brands fa-css3 text-blue-400',
        scss: 'fa-brands fa-sass text-pink-400',
        json: 'fa-solid fa-file-code text-yellow-300',
        yaml: 'fa-solid fa-file-code text-blue-300',
        yml: 'fa-solid fa-file-code text-blue-300',
        md: 'fa-solid fa-file-lines text-gray-400',
        py: 'fa-brands fa-python text-blue-500',
        vue: 'fa-brands fa-vuejs text-green-400',
        sh: 'fa-solid fa-terminal text-green-400',
        go: 'fa-brands fa-golang text-cyan-400',
        rs: 'fa-brands fa-rust text-orange-400'
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
    hasChanges() {
      if (!this.editor) return false
      return this.editor.getValue() !== this.originalContent
    },
    isBinaryFile() {
      return this.activeFile?.is_binary
    }
  },
  watch: {
    activeFile: {
      immediate: true,
      handler(newFile) {
        this.$nextTick(() => {
          if (!this.editor && this.$refs.editorContainer) {
            this.initEditor()
          }
          
          if (newFile && this.editor) {
            this.loadFileContent(newFile.path).then(content => {
              const language = this.getLanguageFromFilename(newFile.name)
              const model = monaco.editor.createModel(content, language)
              this.editor.setModel(model)
              this.originalContent = content
            })
          } else if (this.editor) {
            this.editor.setModel(monaco.editor.createModel('', 'plaintext'))
            this.originalContent = ''
          }
        })
      }
    }
  },
  async created() {
    await this.browse('')
    document.addEventListener('click', this.hideContextMenu)
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu)
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
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
        has_children: node.is_directory,
        expanded: false,
        children: []
      }
    },
    handleSelect(node) {
      this.selectedPath = node.path
      this.selectedItem = node
    },
    async openFile(node) {
      if (node.is_directory) return
      
      const existingFile = this.openFiles.find(f => f.path === node.path)
      if (existingFile) {
        this.activeFile = existingFile
        return
      }
      
      this.fileLoading = true
      try {
        const content = await this.loadFileContent(node.path)
        const fileData = {
          name: node.name,
          path: node.path,
          is_binary: this.fileContent?.is_binary || false
        }
        this.openFiles.push(fileData)
        this.activeFile = fileData
      } catch (e) {
        console.error('Open file failed:', e)
      } finally {
        this.fileLoading = false
      }
    },
    closeFile(file) {
      const index = this.openFiles.findIndex(f => f.path === file.path)
      this.openFiles = this.openFiles.filter(f => f.path !== file.path)
      
      if (this.activeFile?.path === file.path) {
        const newIndex = index > 0 ? index - 1 : 0
        this.activeFile = this.openFiles.length > 0 ? this.openFiles[Math.min(newIndex, this.openFiles.length - 1)] : null
      }
    },
    async saveFile() {
      if (!this.activeFile || !this.hasChanges) return
      
      this.saving = true
      try {
        const content = this.editor.getValue()
        await api.writeFile(this.activeFile.path, content)
        this.originalContent = content
        this.$message.success('文件已保存')
      } catch (e) {
        console.error('Save file failed:', e)
        this.$message.error('保存文件失败')
      } finally {
        this.saving = false
      }
    },
    async handleLoadChildren({ path, callback }) {
      try {
        const res = await api.browseFilesystem(path)
        const children = (res.data.items || []).map(item => this.transformNode(item))
        const sortedChildren = children.sort((a, b) => {
          if (a.is_directory === b.is_directory) {
            return a.name.localeCompare(b.name)
          }
          return a.is_directory ? -1 : 1
        })
        callback(sortedChildren)
      } catch (e) {
        console.error('Load children failed:', e)
        callback([])
      }
    },
    goUp() {
      if (this.browseResult.parent_path === null) return
      this.browse(this.browseResult.parent_path === '' ? '' : this.browseResult.parent_path)
    },
    goHome() {
      this.browse('')
    },
    refresh() {
      this.browse(this.browseResult.current_path || '')
    },
    async loadFileContent(path) {
      try {
        const res = await api.getFileContent(path)
        this.fileContent = res
        return res.content || ''
      } catch (e) {
        console.error('Load file content failed:', e)
        this.fileContent = { content: '加载失败', is_binary: false, size: 0 }
        return ''
      }
    },
    startResize(e) {
      this.isResizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    handleResize(e) {
      if (!this.isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 150 && newWidth <= 500) {
        this.sidebarWidth = newWidth
      }
    },
    stopResize() {
      this.isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    },
    showContextMenu(e, node) {
      if (!node) return
      e.preventDefault()
      this.contextMenu = {
        visible: true,
        x: e.pageX,
        y: e.pageY,
        target: node
      }
      this.selectedItem = node
      this.selectedPath = node.path
    },
    hideContextMenu() {
      this.contextMenu.visible = false
    },
    async createNewFile() {
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
        this.$refs.renameInput?.focus()
      })
    },
    async createNewFolder() {
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
        this.$refs.renameInput?.focus()
      })
    },
    copyPath() {
      this.hideContextMenu()
      navigator.clipboard.writeText(this.contextMenu.target.path)
      this.$message.success('路径已复制')
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
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },
    async confirmInput() {
      const { type, value, target } = this.inputDialog
      if (!value.trim()) {
        this.cancelInput()
        return
      }
      
      try {
        if (type === 'file') {
          const newPath = target.path + '\\' + value.trim()
          await api.writeFile(newPath, '')
        } else if (type === 'folder') {
          const newPath = target.path + '\\' + value.trim()
          await api.createDirectory(newPath)
        } else if (type === 'rename') {
          await api.renameFile(target.path, value.trim())
        }
        this.refresh()
      } catch (e) {
        console.error('Operation failed:', e)
        this.$message.error('操作失败')
      }
      
      this.inputDialog.visible = false
    },
    cancelInput() {
      this.inputDialog.visible = false
    },
    async deleteItem() {
      this.hideContextMenu()
      try {
        await this.$confirm(`确定要删除 "${this.contextMenu.target.name}" 吗？`, '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await api.deleteFile(this.contextMenu.target.path)
        this.$message.success('删除成功')
        this.refresh()
      } catch (e) {
        if (e !== 'cancel') {
          console.error('Delete failed:', e)
          this.$message.error('删除失败')
        }
      }
    },
    initEditor() {
      if (this.editor) return
      if (!this.$refs.editorContainer) return
      
      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: '',
        language: 'plaintext',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false,
          vertical: 'auto',
          horizontal: 'auto'
        }
      })

      this.editor.onDidChangeModelContent(() => {
        this.$forceUpdate()
      })

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveFile()
      })
    },
    getFileIcon(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const name = filename.toLowerCase()
      
      if (name === 'dockerfile') return 'fa-brands fa-docker text-blue-400'
      if (name === '.gitignore') return 'fa-brands fa-git text-red-400'
      if (name.startsWith('readme')) return this.fileIcons.md
      
      return this.fileIcons[ext] || 'fa-solid fa-file text-gray-400'
    },
    getLanguageFromFilename(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const langMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
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
.sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #505050;
}

.monaco-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.monaco-editor-container >>> .monaco-editor {
  padding-top: 8px;
}

.monaco-editor-container >>> .monaco-editor .overflow-guard {
  overflow: hidden !important;
}
</style>
