<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择文件</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="toolbar">
          <button class="toolbar-btn" @click="goHome" title="根目录">⌂</button>
          <button class="toolbar-btn" @click="refresh" title="刷新">↻</button>
          <span class="current-path">{{ currentPath || '根目录' }}</span>
        </div>
        <div class="tree-container">
          <div v-if="loading" class="empty-hint">加载中...</div>
          <div v-else-if="rootNodes.length === 0" class="empty-hint">空目录</div>
          <DesktopFileSelectTreeNode
            v-else
            v-for="node in rootNodes"
            :key="node.path"
            :node="node"
            :level="0"
            :selectedPath="selectedPath"
            @select="handleSelect"
            @load-children="handleLoadChildren"
            @open-file="handleSelect"
          />
        </div>
      </div>
      <div class="dialog-footer">
        <span v-if="selectedPath" class="selected-info">已选: {{ selectedPath }}</span>
        <span v-else class="selected-info placeholder">未选择</span>
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="confirmSelect" :disabled="!selectedPath">选择</button>
      </div>
    </div>
  </div>
</template>

<script>
import { browseFilesystem } from '@/api/index'
import DesktopFileSelectTreeNode from './DesktopFileSelectTreeNode.vue'

export default {
  name: 'DesktopFileSelectDialog',
  components: { DesktopFileSelectTreeNode },
  props: {
    title: { type: String, default: '选择文件' }
  },
  emits: ['close', 'select'],
  data() {
    return {
      rootNodes: [],
      loading: false,
      selectedPath: '',
      currentPath: ''
    }
  },
  mounted() {
    this.loadRoot()
  },
  methods: {
    async loadRoot(path = '') {
      this.loading = true
      try {
        const r = await browseFilesystem(path)
        const d = (r && r.data) || {}
        this.currentPath = d.current_path || path || ''
        const items = d.items || []
        items.sort((a, b) => {
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        })
        this.rootNodes = items.map(e => ({
          name: e.name,
          path: e.path,
          isDirectory: e.is_directory,
          hasChildren: e.is_directory
        }))
      } catch (e) {
        this.rootNodes = []
      } finally {
        this.loading = false
      }
    },
    handleSelect(node) {
      if (node.isDirectory) return
      this.selectedPath = node.path
    },
    async handleLoadChildren({ path, callback }) {
      try {
        const r = await browseFilesystem(path)
        const d = (r && r.data) || {}
        const items = d.items || []
        items.sort((a, b) => {
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        })
        callback(items.map(e => ({
          name: e.name,
          path: e.path,
          isDirectory: e.is_directory,
          hasChildren: e.is_directory
        })))
      } catch (e) {
        callback([])
      }
    },
    goHome() {
      this.selectedPath = ''
      this.loadRoot('')
    },
    refresh() {
      this.loadRoot(this.currentPath)
    },
    confirmSelect() {
      if (this.selectedPath) {
        this.$emit('select', this.selectedPath)
        this.$emit('close')
      }
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 520px; max-width: 90vw; max-height: 75vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.toolbar {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 8px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.toolbar-btn {
  padding: 3px 8px; background: var(--bg-input); border: none; border-radius: 4px;
  color: var(--text-muted); cursor: pointer; font-size: 13px; font-family: inherit;
}
.toolbar-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.current-path {
  flex: 1; padding: 4px 10px; font-size: 12px; color: var(--text-muted);
  background: var(--bg-input); border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tree-container { flex: 1; overflow-y: auto; padding: 4px 0; min-height: 100px; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.selected-info { font-size: 12px; color: var(--accent); margin-right: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected-info.placeholder { color: var(--text-muted); }
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
