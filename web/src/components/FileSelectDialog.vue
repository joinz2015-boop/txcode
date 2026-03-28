<template>
  <el-dialog
    :visible.sync="visible"
    title="选择文件"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="file-select-content">

      <div class="file-tree-container">
        <file-select-tree-node
          v-for="node in fileTreeData"
          :key="node.path"
          :node="node"
          :level="0"
          :selected-path="selectedPath"
          @select="handleSelect"
          @load-children="handleLoadChildren"
        />
        <div v-if="loading" class="empty-files">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="fileTreeData.length === 0" class="empty-files">
          此目录为空
        </div>
      </div>
      <div class="file-select-footer">
        <span class="selected-path">{{ selectedPath || '未选择' }}</span>
        <button 
          class="confirm-btn" 
          :disabled="!selectedPath"
          @click="handleConfirm"
        >选择</button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import FileSelectTreeNode from './FileSelectTreeNode.vue'
import { api } from '../api'

export default {
  name: 'FileSelectDialog',
  components: { FileSelectTreeNode },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      currentPath: '',
      selectedPath: '',
      parentPath: null,
      fileTreeData: []
    }
  },
  computed: {
    canGoUp() {
      return this.parentPath !== null && this.parentPath !== ''
    }
  },
  methods: {
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
        console.error('Load file tree failed:', e)
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
        is_drive: node.is_drive || false,
        size: node.size,
        has_children: node.is_directory,
        expanded: false,
        children: []
      }
    },
    handleSelect(node) {
      this.selectedPath = node.path
    },
    handleConfirm() {
      if (!this.selectedPath) return
      this.$emit('select', this.selectedPath)
      this.$emit('update:visible', false)
    },
    async handleLoadChildren({ path, callback }) {
      try {
        const res = await api.browseFilesystem(path)
        const children = (res.data?.items || []).map(item => this.transformNode(item))
        children.sort((a, b) => {
          if (a.is_directory === b.is_directory) {
            return a.name.localeCompare(b.name)
          }
          return a.is_directory ? -1 : 1
        })
        callback(children)
      } catch (e) {
        console.error('Load children failed:', e)
        callback([])
      }
    },
    goUp() {
      if (this.parentPath === null) return
      this.loadFileTree(this.parentPath === '' ? '' : this.parentPath)
    },
    goHome() {
      this.loadFileTree('')
    },
    refresh() {
      this.loadFileTree(this.currentPath || '')
    },
    handleClose() {
      this.$emit('close')
    },
    open() {
      this.loadFileTree('')
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadFileTree('')
      }
    }
  }
}
</script>

<style scoped>
.file-select-content { height: 400px; display: flex; flex-direction: column; }
.file-select-toolbar { display: flex; gap: 4px; margin-bottom: 8px; }
.toolbar-btn { padding: 4px 8px; background: #27272a; border: none; border-radius: 4px; color: #a1a1aa; cursor: pointer; }
.toolbar-btn:hover { background: #3f3f46; color: #fff; }
.toolbar-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.file-select-path { padding: 8px 12px; background: #27272a; color: #a1a1aa; font-size: 13px; border-radius: 4px; margin-bottom: 8px; }
.file-tree-container { flex: 1; overflow-y: auto; border: 1px solid #3f3f46; border-radius: 4px; }
.empty-files { padding: 20px; text-align: center; color: #71717a; }
.file-select-hint { margin-top: 8px; padding: 8px; background: #27272a; color: #a1a1aa; font-size: 12px; border-radius: 4px; text-align: center; }
.file-select-footer { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.selected-path { flex: 1; padding: 8px 12px; background: #27272a; color: #a1a1aa; font-size: 13px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.confirm-btn { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 4px; color: white; font-size: 13px; cursor: pointer; }
.confirm-btn:hover { background: #2563eb; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

:deep(.el-dialog) {
  background: #18181b;
  border: 1px solid #3f3f46;
}
:deep(.el-dialog__header) {
  background: #18181b;
  border-bottom: 1px solid #3f3f46;
  padding: 16px 20px;
}
:deep(.el-dialog__title) {
  color: #d4d4d8;
  font-size: 15px;
  font-weight: 500;
}
:deep(.el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}
:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #71717a;
}
:deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #fff;
}
:deep(.el-dialog__body) {
  background: #18181b;
  padding: 20px;
  color: #d4d4d8;
}
</style>
