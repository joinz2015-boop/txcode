<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择文件</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="path-bar">
          <input class="path-input" v-model="currentPath" @keydown.enter="loadDir" placeholder="输入路径..." />
          <button class="btn-go" @click="loadDir">浏览</button>
        </div>
        <div class="file-list" v-if="!loading">
          <div v-if="parentPath !== null" class="file-item" @click="navigateUp">
            <span class="file-icon">📁</span>
            <span class="file-name" style="color:var(--accent);">..</span>
          </div>
          <div v-for="item in entries" :key="item.path" class="file-item" @click="selectItem(item)">
            <span class="file-icon">{{ item.isDirectory ? '📁' : '📄' }}</span>
            <span class="file-name">{{ item.name }}</span>
          </div>
          <div v-if="entries.length === 0 && !parentPath" class="empty-hint">空目录</div>
        </div>
        <div v-else class="loading-hint">加载中...</div>
      </div>
      <div class="dialog-footer">
        <span v-if="selectedPath" class="selected-info">已选: {{ selectedPath }}</span>
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="confirmSelect" :disabled="!selectedPath">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
import { browseFilesystem } from '@/api/index'

export default {
  name: 'DesktopFileSelectDialog',
  props: {
    title: { type: String, default: '选择文件' }
  },
  emits: ['close', 'select'],
  data() {
    return {
      currentPath: '',
      entries: [],
      loading: false,
      selectedPath: '',
      parentPath: null
    }
  },
  mounted() {
    this.loadDir()
  },
  methods: {
    async loadDir() {
      const path = this.currentPath.trim() || ''
      this.loading = true
      try {
        const r = await browseFilesystem(path)
        const data = r.data || { entries: [], parent: null }
        this.entries = data.entries || []
        this.parentPath = data.parent !== undefined ? data.parent : null
        this.currentPath = data.current || path
      } catch (e) {
        this.entries = []
      } finally {
        this.loading = false
      }
    },
    navigateUp() {
      if (this.parentPath !== null) {
        this.currentPath = this.parentPath
        this.loadDir()
      }
    },
    selectItem(item) {
      if (item.isDirectory) {
        this.currentPath = item.path
        this.loadDir()
      } else {
        this.selectedPath = item.path
      }
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
.dialog-body { flex: 1; overflow-y: auto; padding: 12px; }
.path-bar { display: flex; gap: 6px; margin-bottom: 10px; }
.path-input {
  flex: 1; padding: 6px 10px; font-size: 12px; border: 1px solid var(--border);
  border-radius: 5px; color: var(--text-primary); background: #fafbfc; outline: none; font-family: inherit;
}
.path-input:focus { border-color: var(--accent); }
.btn-go {
  padding: 6px 12px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit;
}
.file-list { max-height: 350px; overflow-y: auto; }
.file-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px;
  cursor: pointer; font-size: 13px; color: var(--text-primary); transition: background 0.1s;
}
.file-item:hover { background: var(--bg-hover); }
.file-icon { flex-shrink: 0; font-size: 14px; }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint, .loading-hint {
  text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;
}
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.selected-info { font-size: 12px; color: var(--accent); margin-right: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
