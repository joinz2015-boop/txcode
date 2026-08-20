<template>
  <div class="git-change-list">
    <div class="side-header">
      <div class="side-title">变更文件 <span class="badge">{{ changes.length }}</span></div>
      <div class="side-actions">
        <button class="s-btn" title="刷新" :disabled="loading" @click="$emit('refresh')">&#x21BB;</button>
      </div>
    </div>

    <div class="side-search">
      <input v-model="searchKey" placeholder="搜索文件..." />
    </div>

    <div class="side-filter">
      <span class="filter-chip" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</span>
      <span class="filter-chip" :class="{ active: filter === 'staged' }" @click="setFilter('staged')">已暂存</span>
      <span class="filter-chip" :class="{ active: filter === 'unstaged' }" @click="setFilter('unstaged')">未暂存</span>
    </div>

    <div class="tree">
      <div v-if="loading && changes.length === 0" class="list-empty">加载中...</div>
      <template v-else>
        <div v-for="group in groups" :key="group.key">
          <div
            v-if="group.items.length"
            class="group-title"
            :class="{ collapsed: collapsed[group.key] }"
            @click="toggleGroup(group.key)"
          >
            <span class="chev">&#x25BE;</span>
            <span class="dot" :style="{ background: group.color }"></span>
            {{ group.label }}
            <span class="count">{{ group.items.length }}</span>
          </div>
          <template v-if="!collapsed[group.key]">
            <div
              v-for="change in group.items"
              :key="change.path"
              class="file-row"
              :class="{ selected: change.path === selectedPath }"
              :title="change.path"
              @click="$emit('select', change)"
            >
              <span class="f-status" :class="statusClass(change)">{{ statusChar(change) }}</span>
              <span class="f-name">{{ fileName(change.path) }}</span>
              <span v-if="statsMap[change.path]" class="f-stats">
                <span v-if="statsMap[change.path].added > 0" class="add">+{{ statsMap[change.path].added }}</span>
                <span v-if="statsMap[change.path].removed > 0" class="del">-{{ statsMap[change.path].removed }}</span>
              </span>
              <span v-else-if="change.status === 'untracked'" class="f-stats new">new</span>
            </div>
          </template>
        </div>
        <div v-if="filtered.length === 0 && !loading" class="list-empty">
          <p>{{ changes.length === 0 ? '没有变更' : '无匹配文件' }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopGitChangeList',
  props: {
    changes: { type: Array, default: () => [] },
    selectedPath: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    statsMap: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      searchKey: '',
      filter: 'all',
      collapsed: { staged: false, unstaged: false, untracked: false }
    }
  },
  computed: {
    filtered() {
      const key = this.searchKey.trim().toLowerCase()
      let list = this.changes
      if (this.filter === 'staged') list = list.filter(c => c.staged)
      else if (this.filter === 'unstaged') list = list.filter(c => !c.staged)
      if (key) {
        list = list.filter(c => String(c.path || '').toLowerCase().includes(key))
      }
      return list
    },
    groups() {
      const staged = this.filtered.filter(c => c.staged)
      const unstaged = this.filtered.filter(c => !c.staged && c.status !== 'untracked')
      const untracked = this.filtered.filter(c => c.status === 'untracked')
      return [
        { key: 'staged', label: '已暂存', color: 'var(--green)', items: staged },
        { key: 'unstaged', label: '未暂存', color: 'var(--yellow)', items: unstaged },
        { key: 'untracked', label: '未跟踪', color: 'var(--text-muted)', items: untracked }
      ]
    }
  },
  methods: {
    setFilter(filter) {
      this.filter = filter
    },
    toggleGroup(key) {
      this.$set(this.collapsed, key, !this.collapsed[key])
    },
    statusChar(change) {
      if (change.status === 'untracked') return '?'
      if (change.status === 'added') return 'A'
      if (change.status === 'deleted') return 'D'
      if (change.status === 'renamed') return 'R'
      return 'M'
    },
    statusClass(change) {
      if (change.status === 'untracked') return 'U'
      if (change.status === 'added') return 'A'
      if (change.status === 'deleted') return 'D'
      if (change.status === 'renamed') return 'R'
      return 'M'
    },
    fileName(filePath) {
      const parts = String(filePath).replace(/\\/g, '/').split('/')
      return parts[parts.length - 1] || filePath
    }
  }
}
</script>

<style scoped>
.git-change-list {
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
}
.side-title .badge {
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
  background: var(--accent-light);
  color: var(--accent);
  padding: 1px 7px;
  border-radius: 9px;
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
  font-size: 12px;
}
.s-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.s-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  box-sizing: border-box;
}
.side-search input:focus {
  border-color: var(--accent);
}
.side-search input::placeholder {
  color: var(--text-muted);
}
.side-filter {
  display: flex;
  gap: 4px;
  padding: 0 12px 6px;
  flex-shrink: 0;
}
.filter-chip {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-secondary);
  transition: all 0.15s;
  font-family: inherit;
  font-weight: 500;
}
.filter-chip:hover {
  color: var(--text-primary);
  border-color: #c8c9d2;
}
.filter-chip.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}
.tree {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0 12px;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px 2px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.group-title:hover {
  color: var(--text-secondary);
}
.group-title .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.group-title .count {
  margin-left: auto;
  font-size: 10px;
  background: var(--bg-input);
  color: var(--text-muted);
  padding: 0 6px;
  border-radius: 8px;
}
.group-title .chev {
  font-size: 8px;
  color: var(--text-muted);
  transition: transform 0.15s;
  flex-shrink: 0;
}
.group-title.collapsed .chev {
  transform: rotate(-90deg);
}
.file-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px 0 16px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  user-select: none;
  border-left: 2px solid transparent;
}
.file-row:hover {
  background: var(--bg-hover);
}
.file-row.selected {
  background: var(--accent-light);
  border-left-color: var(--accent);
}
.file-row.selected .f-name {
  color: var(--accent);
  font-weight: 500;
}
.f-status {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  font-family: 'JetBrains Mono', Consolas, monospace;
  border-radius: 3px;
}
.f-status.M {
  color: var(--yellow);
  background: #fef3c7;
}
.f-status.A {
  color: var(--green);
  background: #d1fae5;
}
.f-status.D {
  color: var(--red);
  background: #fee2e2;
}
.f-status.R {
  color: var(--accent);
  background: #dbeafe;
}
.f-status.U {
  color: var(--text-muted);
  background: var(--bg-input);
}
.f-name {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 11.5px;
}
.f-stats {
  display: flex;
  gap: 4px;
  font-size: 10px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  flex-shrink: 0;
  font-weight: 600;
}
.f-stats .add {
  color: var(--green);
}
.f-stats .del {
  color: var(--red);
}
.f-stats.new {
  color: var(--text-muted);
  font-weight: 400;
}
.list-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
.list-empty p {
  margin: 0;
}
</style>
