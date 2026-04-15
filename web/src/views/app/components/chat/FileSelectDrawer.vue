<template>
  <div>
    <div class="drawer-overlay" :class="{ show: visible }" @click="handleClose"></div>
    <div class="file-drawer" :class="{ show: visible }">
      <div class="drawer-header">
        <span class="drawer-title" style="color: #f4f4f5;">选择文件</span>
        <button class="drawer-close" @click="handleClose">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="file-toolbar">
        <button class="toolbar-btn" @click="goUp" :disabled="!canGoUp">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button class="toolbar-btn" @click="goHome">
          <i class="fa-solid fa-home"></i>
        </button>
        <div class="file-path">{{ currentPath || '/' }}</div>
      </div>
      <div class="file-tree-container">
        <div v-if="loading" class="file-loading">
          <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
        </div>
        <div v-else-if="fileTreeData.length === 0" class="file-empty">
          此目录为空
        </div>
        <template v-else>
          <FileTreeNode
            v-for="node in fileTreeData"
            :key="node.path"
            :node="node"
            :selected-path="selectedPath"
            @load-children="onLoadChildren"
            @select-node="onSelectNode"
          />
        </template>
      </div>
      <div class="drawer-footer">
        <div class="selected-path">{{ selectedPath || '未选择' }}</div>
        <button class="confirm-btn" :disabled="!selectedPath" @click="handleConfirm">选择</button>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../../../api'
import FileTreeNode from './FileTreeNode.vue'

export default {
  name: 'FileSelectDrawer',
  components: { FileTreeNode },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      currentPath: '',
      parentPath: null,
      fileTreeData: [],
      selectedPath: '',
      loading: false
    }
  },
  computed: {
    canGoUp() {
      return this.parentPath !== null && this.parentPath !== undefined
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadFileTree('')
      } else {
        this.reset()
      }
    }
  },
  methods: {
    reset() {
      this.currentPath = ''
      this.parentPath = null
      this.fileTreeData = []
      this.selectedPath = ''
      this.loading = false
    },

    async loadFileTree(path = '') {
      this.loading = true
      try {
        const res = await api.browseFilesystem(path)
        this.currentPath = res.data?.current_path || path
        this.parentPath = res.data?.parent_path
        const items = (res.data?.items || []).map(item => this.transformNode(item))
        items.sort((a, b) => {
          if (a.is_directory === b.is_directory) {
            return a.name.localeCompare(b.name)
          }
          return a.is_directory ? -1 : 1
        })
        this.fileTreeData = items
      } catch (e) {
        console.error('加载文件树失败:', e)
        this.fileTreeData = []
      } finally {
        this.loading = false
      }
    },

    transformNode(node) {
      return {
        name: node.name,
        path: node.path,
        is_directory: node.is_directory,
        has_children: node.is_directory,
        expanded: false,
        children: [],
        loading: false
      }
    },
    async onLoadChildren(node) {
      try {
        const res = await api.browseFilesystem(node.path)
        const children = (res.data?.items || []).map(item => this.transformNode(item))
        children.sort((a, b) => {
          if (a.is_directory === b.is_directory) {
            return a.name.localeCompare(b.name)
          }
          return a.is_directory ? -1 : 1
        })
        node.children = children
        node.expanded = true
      } catch (e) {
        console.error('加载子目录失败:', e)
        node.children = []
        node.expanded = true
      } finally {
        node.loading = false
      }
    },

    onSelectNode(node) {
      this.selectedPath = node.path
    },

    goUp() {
      if (this.parentPath !== null && this.parentPath !== undefined) {
        this.loadFileTree(this.parentPath === '' ? '' : this.parentPath)
      }
    },

    goHome() {
      this.loadFileTree('')
    },

    handleConfirm() {
      if (!this.selectedPath) return
      this.$emit('select', this.selectedPath)
      this.$emit('close')
    },

    handleClose() {
      this.$emit('close')
    },

    getFileIcon(name, isDir) {
      if (isDir) return 'fa-solid fa-folder'

      const ext = name.split('.').pop().toLowerCase()
      const nameLower = name.toLowerCase()

      const iconMap = {
        js: 'fa-brands fa-js',
        jsx: 'fa-brands fa-react',
        ts: 'fa-brands fa-js',
        tsx: 'fa-brands fa-react',
        vue: 'fa-brands fa-vuejs',
        py: 'fa-brands fa-python',
        html: 'fa-brands fa-html5',
        htm: 'fa-brands fa-html5',
        css: 'fa-brands fa-css3',
        scss: 'fa-brands fa-sass',
        json: 'fa-solid fa-file-code',
        yaml: 'fa-solid fa-file-code',
        yml: 'fa-solid fa-file-code',
        md: 'fa-solid fa-file-lines',
        sql: 'fa-solid fa-database',
        sh: 'fa-solid fa-terminal',
        go: 'fa-brands fa-golang',
        java: 'fa-brands fa-java',
        dockerfile: 'fa-brands fa-docker'
      }

      if (nameLower === 'dockerfile') return 'fa-brands fa-docker'
      if (nameLower === '.gitignore') return 'fa-brands fa-git'

      return iconMap[ext] || 'fa-solid fa-file'
    }
  }
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  z-index: 998;
}

.drawer-overlay.show {
  opacity: 1;
  visibility: visible;
}

.file-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-secondary, #121212);
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 999;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.file-drawer.show {
  transform: translateY(0);
}

.drawer-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #27272a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #f4f4f5);
}

.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary, #18191b);
  border: none;
  color: var(--text-muted, #84848a);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #27272a);
}

.toolbar-btn {
  padding: 8px 12px;
  background: var(--bg-tertiary, #18191b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 6px;
  color: var(--text-secondary, #d4d4d8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn:active:not(:disabled) {
  background: var(--accent, #3b82f6);
  color: white;
}

.file-path {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-tertiary, #18191b);
  border-radius: 6px;
  color: var(--text-muted, #84848a);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 200px;
  max-height: 400px;
}

.file-loading,
.file-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted, #84848a);
}

.file-node {
  user-select: none;
}

.node-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 8px;
  cursor: pointer;
  color: var(--text-secondary, #d4d4d8);
}

.node-row:active {
  background: var(--bg-tertiary, #18191b);
}

.node-row.selected {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent, #3b82f6);
}

.node-row.child {
  padding-left: 40px;
}

.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: var(--text-muted, #84848a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-icon.placeholder {
  visibility: hidden;
}

.expand-icon i {
  font-size: 10px;
}

.node-icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--accent, #3b82f6);
}

.node-row:not(.selected) .node-icon:not([class*="fa-folder"]):not([class*="fa-file"]) {
  color: var(--text-muted, #84848a);
}

.node-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #f4f4f5);
}

.drawer-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #27272a);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  align-items: center;
}

.selected-path {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-tertiary, #18191b);
  border-radius: 8px;
  color: var(--text-primary, #f4f4f5);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-btn {
  padding: 10px 20px;
  background: var(--accent, #3b82f6);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirm-btn:active:not(:disabled) {
  transform: scale(0.95);
}
</style>
