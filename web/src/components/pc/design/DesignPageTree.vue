<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
      <button @click="refresh" class="p-1 text-textMuted hover:text-white" title="刷新">
        <i class="fa-solid fa-refresh"></i>
      </button>
      <button @click="createRootFolder" class="p-1 text-textMuted hover:text-white" title="新建文件夹">
        <i class="fa-solid fa-folder-plus"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto py-1 pb-8 sidebar-scroll">
      <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
      <div v-else-if="fileTreeData.length === 0" class="flex flex-col items-center justify-center py-12 text-textMuted text-sm">
        <i class="fa-solid fa-folder-open text-4xl mb-3 opacity-20"></i>
        <p>设计目录为空</p>
        <p class="text-xs mt-1">右键文件夹创建网页</p>
      </div>
      <file-tree-node
        v-else
        v-for="node in fileTreeData"
        :key="node.path"
        :node="node"
        :level="0"
        :selected-path="selectedPath"
        :expanded-paths="expandedPaths"
        @select="handleSelect"
        @open-file="handleOpenFile"
        @load-children="handleLoadChildren"
        @contextmenu="showContextMenu"
        @expand-path="onExpandPath"
        @collapse-path="onCollapsePath"
      />
    </div>

    <div
      v-show="contextMenu.visible"
      class="fixed bg-sidebar border border-border rounded shadow-lg py-1 z-50 min-w-[160px]"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <template v-if="contextMenu.target?.is_directory">
        <button @click="createNewPage" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
          <i class="fa-solid fa-file-lines text-xs"></i> 新建网页
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
        <button @click="downloadFile" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
          <i class="fa-solid fa-download text-xs"></i> 下载
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
      v-show="renameDialog.visible"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelRename"
    >
      <div class="bg-sidebar border border-border rounded p-4 w-80">
        <p class="text-white text-sm mb-3">{{ renameDialog.title }}</p>
        <input
          ref="renameInput"
          v-model="renameDialog.value"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          class="w-full px-3 py-2 bg-[#1e1e1e] border border-border rounded text-white text-sm focus:outline-none focus:border-accent"
          :placeholder="renameDialog.placeholder"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button @click="cancelRename" class="px-3 py-1 text-xs text-textMuted hover:text-white">取消</button>
          <button @click="confirmRename" class="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-blue-600">确定</button>
        </div>
      </div>
    </div>

    <CreatePageDialog
      :visible.sync="createPageDialogVisible"
      :target-path="createPageTargetPath"
      @created="onPageCreated"
    />

    <CopyPathDialog ref="copyPathDialog" />
  </div>
</template>

<script>
import FileTreeNode from '../file/FileTreeNode.vue'
import CreatePageDialog from './CreatePageDialog.vue'
import CopyPathDialog from '../common/CopyPathDialog.vue'
import { api } from '../../../api/index.js'

export default {
  name: 'DesignPageTree',
  components: { FileTreeNode, CreatePageDialog, CopyPathDialog },
  props: {
    basePath: { type: String, default: '.txcode/design' }
  },
  data() {
    return {
      browseResult: { current_path: '', parent_path: null, items: [] },
      selectedPath: '',
      loading: false,
      expandedPaths: new Set(),
      contextMenu: { visible: false, x: 0, y: 0, target: null },
      renameDialog: { visible: false, title: '', value: '', placeholder: '', target: null, action: 'rename' },
      createPageDialogVisible: false,
      createPageTargetPath: '',
    }
  },
  computed: {
    fileTreeData() {
      const items = this.browseResult.items
        .filter(item => item.name !== 'session.json')
        .map(item => ({
          name: item.name,
          path: item.path,
          is_directory: item.is_directory,
          is_drive: item.is_drive || false,
          size: item.size,
          has_children: item.is_directory,
          expanded: false,
          children: []
        }))
      return items.sort((a, b) => {
        if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
        return a.is_directory ? -1 : 1
      })
    }
  },
  async created() {
    await this.initBrowse()
    document.addEventListener('click', this.hideContextMenu)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu)
  },
  methods: {
    async initBrowse() {
      this.loading = true
      try {
        const res = await api.browseFilesystem(this.basePath)
        this.browseResult = res.data
      } catch (e) {
        try {
          await api.createDirectory(this.basePath)
          const res = await api.browseFilesystem(this.basePath)
          this.browseResult = res.data
        } catch (e2) {
          console.error('Init design directory failed:', e2)
          this.browseResult = { current_path: this.basePath, parent_path: '', items: [] }
        }
      } finally {
        this.loading = false
      }
    },
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
    refresh() {
      this.browse(this.browseResult.current_path || this.basePath)
    },
    createRootFolder() {
      this.renameDialog = {
        visible: true,
        title: '新建文件夹',
        value: '',
        placeholder: '输入文件夹名',
        target: { path: this.browseResult.current_path || this.basePath, is_directory: true },
        action: 'createFolder'
      }
      this.$nextTick(() => this.$refs.renameInput?.focus())
    },
    handleSelect(node) {
      this.selectedPath = node.path
      let relPath = node.path
      if (relPath.startsWith(this.basePath + '/')) {
        relPath = relPath.slice(this.basePath.length + 1)
      } else if (relPath === this.basePath) {
        relPath = ''
      }
      if (!node.is_directory && relPath.endsWith('.html')) {
        console.log('[DesignPageTree] handleSelect emitting current-page:', relPath)
        this.$emit('current-page', relPath)
      } else {
        console.log('[DesignPageTree] handleSelect skipping (dir or non-html):', node.name, 'isDir:', node.is_directory)
      }
    },
    handleOpenFile(node) {
      this.$emit('open-file', node)
    },
    async handleLoadChildren({ path, callback }) {
      try {
        const res = await api.browseFilesystem(path)
        const children = (res.data.items || [])
          .filter(item => item.name !== 'session.json')
          .map(item => ({
            name: item.name,
            path: item.path,
            is_directory: item.is_directory,
            is_drive: false,
            size: item.size,
            has_children: item.is_directory,
            expanded: false,
            children: []
          }))
        callback(children.sort((a, b) => {
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        }))
      } catch (e) {
        console.error('Load children failed:', e)
        callback([])
      }
    },
    showContextMenu(e, node) {
      if (!node) return
      e.preventDefault()
      this.contextMenu = { visible: true, x: e.pageX, y: e.pageY, target: node }
      this.selectedPath = node.path
    },
    hideContextMenu() {
      this.contextMenu.visible = false
    },
    copyPath() {
      this.hideContextMenu()
      this.$refs.copyPathDialog.open(this.contextMenu.target.path)
    },
    createNewPage() {
      this.hideContextMenu()
      this.createPageTargetPath = this.contextMenu.target.path
      this.createPageDialogVisible = true
    },
    createNewFolder() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      this.renameDialog = {
        visible: true,
        title: '新建文件夹',
        value: '',
        placeholder: '输入文件夹名',
        target: target,
        action: 'createFolder'
      }
      this.$nextTick(() => this.$refs.renameInput?.focus())
    },
    renameItem() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      if (target.is_directory) {
        this.renameDialog = {
          visible: true, title: '重命名文件夹', value: target.name, placeholder: '输入新名称', target, action: 'rename'
        }
      } else {
        this.renameDialog = {
          visible: true, title: '重命名文件', value: target.name, placeholder: '输入新名称', target, action: 'rename'
        }
      }
      this.$nextTick(() => {
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },
    confirmRename() {
      const { value, target, action } = this.renameDialog
      if (!value.trim()) { this.renameDialog.visible = false; return }
      const separator = target.path.includes('\\') ? '\\' : '/'
      let newPath
      let apiCall
      if (action === 'createFolder') {
        newPath = target.path + separator + value.trim()
        apiCall = api.createDirectory(newPath)
      } else {
        const parentPath = target.path.substring(0, target.path.lastIndexOf(separator))
        newPath = parentPath + separator + value.trim()
        apiCall = api.renameFile(target.path, newPath)
      }
      apiCall.then(() => {
        this.refresh()
        this.$emit('file-changed')
      }).catch(e => {
        console.error('Operation failed:', e)
        this.$message.error(action === 'createFolder' ? '创建文件夹失败' : '重命名失败')
      })
      this.renameDialog.visible = false
    },
    cancelRename() { this.renameDialog.visible = false },
    async deleteItem() {
      this.hideContextMenu()
      try {
        await this.$confirm(`确定要删除 "${this.contextMenu.target.name}" 吗？`, '确认删除', {
          confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
        })
        await api.deleteFile(this.contextMenu.target.path)
        this.$message.success('删除成功')
        this.refresh()
        this.$emit('file-changed')
      } catch (e) {
        if (e !== 'cancel') { console.error('Delete failed:', e); this.$message.error('删除失败') }
      }
    },
    downloadFile() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      if (!target) return
      api.downloadFilesystemWithProgress(target.path, target.name, () => {})
        .catch(e => this.$message.error('下载失败: ' + e.message))
    },
    onPageCreated() {
      this.createPageDialogVisible = false
      this.refresh()
      this.$emit('file-changed')
    },

    onExpandPath(path) {
      const newSet = new Set(this.expandedPaths)
      newSet.add(path)
      this.expandedPaths = newSet
    },
    onCollapsePath(path) {
      const newSet = new Set(this.expandedPaths)
      newSet.delete(path)
      this.expandedPaths = newSet
    }
  }
}
</script>

<style scoped>
.sidebar-scroll::-webkit-scrollbar { width: 8px; }
.sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
.sidebar-scroll::-webkit-scrollbar-thumb { background: #404040; border-radius: 4px; }
.sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #505050; }
</style>
