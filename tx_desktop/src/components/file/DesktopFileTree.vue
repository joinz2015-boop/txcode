<template>
  <div class="file-tree">
    <div class="side-header">
      <span class="side-title">文件</span>
      <div class="side-actions">
        <button class="s-btn" title="新建文件" @click="startCreate('file')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </button>
        <button class="s-btn" title="新建文件夹" @click="startCreate('dir')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
        </button>
        <button class="s-btn" title="刷新" @click="refreshTree">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button class="s-btn" title="折叠全部" @click="collapseAll">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>

    <div class="side-search">
      <input
        ref="searchInput"
        type="text"
        placeholder="搜索文件 (Ctrl+F)"
        :value="searchTerm"
        @input="onSearch"
        @keydown.esc="clearSearch"
      />
    </div>

    <div class="tree">
      <div v-if="loading" class="empty-tree">加载中...</div>
      <template v-else-if="root">
        <div v-if="!hasVisibleRows" class="empty-tree">未找到匹配文件</div>
        <DesktopFileTreeNode
          v-else
          :node="root"
          :level="0"
          @contextmenu="onContextMenu"
        />
      </template>
    </div>
  </div>
</template>

<script>
import DesktopFileTreeNode from './DesktopFileTreeNode.vue'

export default {
  name: 'DesktopFileTree',
  components: { DesktopFileTreeNode },
  inject: ['fileManager'],
  computed: {
    root() {
      return this.fileManager.state.root
    },
    loading() {
      return this.fileManager.state.loading
    },
    searchTerm() {
      return this.fileManager.state.searchTerm
    },
    hasVisibleRows() {
      return this.fileManager.visibleRows.length > 0
    }
  },
  methods: {
    startCreate(mode) {
      const selected = this.fileManager.findNode(this.fileManager.state.selectedPath)
      const parent = selected && selected.type === 'dir' ? selected : this.root
      this.fileManager.startCreate(mode, parent)
    },
    refreshTree() {
      this.fileManager.refreshTree().catch(() => {})
    },
    collapseAll() {
      this.fileManager.collapseAll()
    },
    onSearch(e) {
      this.fileManager.setSearchTerm(e.target.value)
    },
    clearSearch() {
      this.fileManager.setSearchTerm('')
    },
    onContextMenu({ event, node }) {
      this.$emit('contextmenu', { event, node })
    },
    focusSearch() {
      this.$nextTick(() => {
        const el = this.$refs.searchInput
        if (el) el.focus()
      })
    }
  }
}
</script>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  flex-shrink: 0;
}
.side-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  user-select: none;
}
.side-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.s-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;
}
.s-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.side-search {
  padding: 0 12px 8px;
  flex-shrink: 0;
}
.side-search input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-input);
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
.side-search input:focus {
  border-color: var(--accent);
}
.side-search input::placeholder {
  color: var(--text-muted);
}
.tree {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0 12px;
}
.empty-tree {
  padding: 20px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
