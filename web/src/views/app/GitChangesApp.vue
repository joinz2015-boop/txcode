<template>
  <div class="git-changes-app">
    <header class="header">
      <a href="/app" class="header-back">
        <i class="fa-solid fa-chevron-left"></i>
      </a>
      <span class="header-title">Git 变更</span>
      <div class="header-actions">
        <button class="header-btn" title="刷新" @click="refresh">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </header>

    <div class="change-summary">
      <div class="summary-stats">
        <span class="stat-item add">
          <i class="fa-solid fa-plus"></i> {{ stats.add }}
        </span>
        <span class="stat-item mod">
          <i class="fa-solid fa-pen"></i> {{ stats.mod }}
        </span>
        <span class="stat-item del">
          <i class="fa-solid fa-minus"></i> {{ stats.del }}
        </span>
      </div>
      <div class="branch-info" v-if="branch">
        <i class="fa-solid fa-code-branch"></i>
        <span>{{ branch }}</span>
      </div>
    </div>

    <div class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}<span class="count">{{ tab.count }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <div
        v-for="filter in filters"
        :key="filter.key"
        class="filter-chip"
        :class="{ active: currentFilter === filter.key }"
        @click="currentFilter = filter.key"
      >
        {{ filter.label }}
      </div>
    </div>

    <div class="file-list" v-if="!isRepo">
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fa-solid fa-folder-open"></i>
        </div>
        <div class="empty-title">非 Git 仓库</div>
        <div class="empty-desc">当前目录不是 Git 仓库，无法查看变更</div>
      </div>
    </div>

    <template v-else-if="filteredChanges.length > 0">
      <div class="file-list" v-if="!selectedChange" ref="fileListRef">
        <div
          v-for="(change, index) in filteredChanges"
          :key="index"
          class="change-item"
          :class="{ selected: selectedChange?.path === change.path }"
          @click="selectChange(change)"
        >
          <div class="change-status" :class="getStatusClass(change.status)">
            <i :class="getStatusIcon(change.status)"></i>
          </div>
          <div class="change-info">
            <div class="change-name">{{ getFileName(change.path) }}</div>
            <div class="change-path">{{ getFilePath(change.path) }}</div>
          </div>
          <div class="change-stats" v-if="change.linesAdded !== undefined || change.linesDeleted !== undefined">
            <span v-if="change.linesAdded" class="add-line">+{{ change.linesAdded }}</span>
            <span v-if="change.linesAdded && change.linesDeleted"> / </span>
            <span v-if="change.linesDeleted" class="del-line">-{{ change.linesDeleted }}</span>
          </div>
        </div>
      </div>

      <div class="diff-view" v-else ref="diffViewRef">
        <div class="diff-header">
          <i class="fa-solid fa-file-code"></i>
          <span>{{ selectedChange.path }}</span>
          <span style="margin-left: auto; color: var(--accent);" @click="selectedChange = null">收起</span>
        </div>
        <div class="diff-content" v-if="!diffLoading && diffLines.length > 0">
          <div
            v-for="(line, idx) in diffLines"
            :key="idx"
            class="diff-line"
            :class="line.type"
          >
            <span class="line-num">{{ line.lineNum }}</span>
            <span class="line-sign" :class="line.type">{{ line.sign }}</span>
            <span class="line-text">{{ line.content }}</span>
          </div>
        </div>
        <div class="diff-loading" v-if="diffLoading">
          <span class="loading-spinner"></span> 加载中...
        </div>
      </div>
    </template>

    <div class="file-list" v-else>
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fa-solid fa-check"></i>
        </div>
        <div class="empty-title">暂无变更</div>
        <div class="empty-desc">工作区干净，没有检测到变更</div>
      </div>
    </div>

    <div class="bottom-actions">
      <button class="action-btn secondary" @click="confirmRevertAll" :disabled="filteredChanges.length === 0">
        <i class="fa-solid fa-arrow-rotate-left"></i>
        撤销全部
      </button>
    </div>

    <confirm-dialog
      :visible="confirmDialog.visible"
      :message="confirmDialog.message"
      @confirm="executeConfirm"
      @cancel="cancelConfirm"
    />
  </div>
</template>

<script>
import { api } from '../../api'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

export default {
  name: 'GitChangesApp',
  components: {
    ConfirmDialog
  },
  data() {
    return {
      isRepo: false,
      branch: '',
      changes: [],
      loading: false,
      selectedChange: null,
      diffLines: [],
      diffLoading: false,
      currentTab: 'modified',
      currentFilter: 'all',
      confirmDialog: {
        visible: false,
        message: '',
        action: null,
        target: null
      }
    }
  },
  computed: {
    tabs() {
      return [
        { key: 'modified', label: '已修改', count: this.changes.filter(c => c.status === 'modified').length },
        { key: 'staged', label: '已暂存', count: this.changes.filter(c => c.status === 'staged').length },
        { key: 'untracked', label: '未跟踪', count: this.changes.filter(c => c.status === 'untracked').length }
      ]
    },
    filters() {
      return [
        { key: 'all', label: '全部' },
        { key: 'file', label: '仅文件' },
        { key: 'dir', label: '仅目录' }
      ]
    },
    stats() {
      return {
        add: this.changes.filter(c => c.status === 'add' || c.status === 'new').length,
        mod: this.changes.filter(c => c.status === 'mod' || c.status === 'modified').length,
        del: this.changes.filter(c => c.status === 'del' || c.status === 'deleted').length
      }
    },
    filteredChanges() {
      let result = this.changes

      if (this.currentTab === 'modified') {
        result = result.filter(c => c.status === 'modified' || c.status === 'mod')
      } else if (this.currentTab === 'staged') {
        result = result.filter(c => c.status === 'staged')
      } else if (this.currentTab === 'untracked') {
        result = result.filter(c => c.status === 'untracked' || c.status === 'new' || c.status === 'add')
      }

      if (this.currentFilter === 'file') {
        result = result.filter(c => !c.path.endsWith('/'))
      } else if (this.currentFilter === 'dir') {
        result = result.filter(c => c.path.endsWith('/'))
      }

      return result
    }
  },
  async created() {
    await this.checkRepo()
    await this.refreshChanges()
  },
  methods: {
    async checkRepo() {
      try {
        const res = await api.gitIsRepo()
        this.isRepo = res.isRepo
        this.branch = res.branch || ''
      } catch (e) {
        this.isRepo = false
      }
    },
    async refreshChanges() {
      if (!this.isRepo) return

      this.loading = true
      try {
        const res = await api.gitStatus()
        this.changes = (res.changes || []).map(c => {
          let status = 'modified'
          if (c.isNew || c.status === 'new') status = 'untracked'
          else if (c.isStaged || c.status === 'staged') status = 'staged'
          else if (c.isDeleted || c.status === 'deleted') status = 'del'
          else if (c.isModified || c.status === 'modified') status = 'mod'
          else if (c.isAdded || c.status === 'added') status = 'add'
          return { ...c, status }
        })
        if (this.selectedChange) {
          const exists = this.changes.find(c => c.path === this.selectedChange.path)
          if (!exists) this.selectedChange = null
        }
      } catch (e) {
        console.error('Failed to get git status:', e)
      } finally {
        this.loading = false
      }
    },
    async refresh() {
      await this.refreshChanges()
    },
    selectChange(change) {
      this.selectedChange = change
      this.loadDiff(change)
    },
    async loadDiff(change) {
      this.diffLoading = true
      this.diffLines = []
      try {
        const res = await api.gitDiff(change.path)
        this.diffLines = this.parseDiff(res.diff || '')
      } catch (e) {
        console.error('Failed to get diff:', e)
      } finally {
        this.diffLoading = false
      }
    },
    parseDiff(diff) {
      if (!diff) return []

      const lines = diff.split('\n')
      let oldLineNum = 1
      let newLineNum = 1
      const result = []

      for (const line of lines) {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
          if (match) {
            oldLineNum = parseInt(match[1])
            newLineNum = parseInt(match[2])
          }
          result.push({ lineNum: '', sign: '', content: line, type: 'header' })
        } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ') || line.startsWith('index ')) {
          continue
        } else if (line.startsWith('-')) {
          result.push({ lineNum: oldLineNum++, sign: '-', content: line.substring(1), type: 'del' })
        } else if (line.startsWith('+')) {
          result.push({ lineNum: newLineNum++, sign: '+', content: line.substring(1), type: 'add' })
        } else {
          result.push({ lineNum: oldLineNum++, sign: ' ', content: line, type: 'context' })
          newLineNum++
        }
      }

      return result
    },
    getStatusClass(status) {
      const map = {
        add: 'add',
        new: 'new',
        mod: 'mod',
        modified: 'mod',
        del: 'del',
        deleted: 'del',
        untracked: 'new'
      }
      return map[status] || 'mod'
    },
    getStatusIcon(status) {
      const map = {
        add: 'fa-solid fa-plus',
        new: 'fa-solid fa-star',
        mod: 'fa-solid fa-pen',
        modified: 'fa-solid fa-pen',
        del: 'fa-solid fa-trash',
        deleted: 'fa-solid fa-trash',
        staged: 'fa-solid fa-check',
        untracked: 'fa-solid fa-star'
      }
      return map[status] || 'fa-solid fa-pen'
    },
    getFileName(path) {
      const parts = path.split('/')
      return parts[parts.length - 1]
    },
    getFilePath(path) {
      const parts = path.split('/')
      parts.pop()
      return parts.join('/')
    },
    confirmRevertAll() {
      if (this.filteredChanges.length === 0) return
      this.confirmDialog = {
        visible: true,
        message: `确定要撤销所有 ${this.filteredChanges.length} 个文件的变更吗？此操作不可恢复。`,
        action: 'revertAll',
        target: null
      }
    },
    cancelConfirm() {
      this.confirmDialog.visible = false
    },
    async executeConfirm() {
      const { action, target } = this.confirmDialog
      this.confirmDialog.visible = false

      try {
        if (action === 'revertAll') {
          await api.gitRevertAll()
          await api.gitDiscardUntracked()
          this.$message.success('所有变更已撤销')
        } else if (action === 'revert') {
          await api.gitRevert(target.path)
          this.$message.success('文件已撤销')
        } else if (action === 'delete') {
          await api.gitDeleteFile(target.path)
          this.$message.success('文件已删除')
        }
        await this.refreshChanges()
      } catch (e) {
        console.error('Operation failed:', e)
        this.$message.error('操作失败: ' + (e.message || '未知错误'))
      }
    },
    openCommit() {
      this.$message.info('提交功能开发中')
    },
  }
}
</script>

<style scoped>
.git-changes-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-primary, #0a0a09);
}

.header {
  background: var(--bg-secondary, #121212);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color, #27272a);
  flex-shrink: 0;
}

.header-back {
  color: var(--text-muted, #84848a);
  font-size: 18px;
  text-decoration: none;
  padding: 8px;
  margin: -8px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-btn {
  color: var(--text-muted, #84848a);
  font-size: 16px;
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.header-btn:hover {
  color: var(--text-primary, #f4f4f5);
}

.change-summary {
  background: var(--bg-secondary, #121212);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #27272a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.summary-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.stat-item.add {
  color: var(--success, #22c55e);
}

.stat-item.mod {
  color: var(--warning, #f59e0b);
}

.stat-item.del {
  color: var(--danger, #ef4444);
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted, #84848a);
}

.branch-info i {
  color: var(--accent, #3b82f6);
}

.tab-bar {
  background: var(--bg-secondary, #121212);
  padding: 0 16px;
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--border-color, #27272a);
  flex-shrink: 0;
}

.tab-item {
  padding: 12px 0;
  font-size: 14px;
  color: var(--text-muted, #84848a);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item.active {
  color: var(--text-primary, #f4f4f5);
  border-bottom-color: var(--accent, #3b82f6);
}

.tab-item .count {
  margin-left: 6px;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--bg-tertiary, #18191b);
  border-radius: 10px;
}

.tab-item.active .count {
  background: var(--accent, #3b82f6);
  color: white;
}

.filter-bar {
  background: var(--bg-secondary, #121212);
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #27272a);
  flex-shrink: 0;
  overflow-x: auto;
}

.filter-bar::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 16px;
  border: 1px solid var(--border-color, #27272a);
  background: transparent;
  color: var(--text-muted, #84848a);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.filter-chip.active {
  background: var(--accent, #3b82f6);
  border-color: var(--accent, #3b82f6);
  color: white;
}

.file-list {
  flex: 1;
  overflow-y: auto;
}

.change-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  border-bottom: 1px solid var(--border-color, #27272a);
  transition: background 0.2s;
  cursor: pointer;
}

.change-item:active {
  background: var(--bg-secondary, #121212);
}

.change-item:active .change-name,
.change-item:active .change-path {
  color: var(--text-secondary, #d4d4d8);
}

.change-item.selected {
  background: var(--bg-secondary, #121212);
  border-left: 3px solid var(--accent, #3b82f6);
  padding-left: 13px;
}

.change-item.selected .change-name,
.change-item.selected .change-path {
  color: var(--text-primary, #f4f4f5);
}

.change-status {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.change-status.add {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.change-status.mod {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.change-status.del {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.change-status.new {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.change-info {
  flex: 1;
  min-width: 0;
}

.change-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f4f4f5;
}

.change-path {
  font-size: 12px;
  color: #84848a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.change-stats {
  font-size: 11px;
  color: var(--text-muted, #84848a);
  text-align: right;
  flex-shrink: 0;
}

.change-stats .add-line {
  color: var(--success, #22c55e);
}

.change-stats .del-line {
  color: var(--danger, #ef4444);
}

.diff-view {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-tertiary, #18191b);
  display: flex;
  flex-direction: column;
}

.diff-header {
  background: var(--bg-secondary, #121212);
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color, #27272a);
  font-size: 13px;
  color: var(--text-secondary, #d4d4d8);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.diff-content {
  padding: 8px 0;
  font-family: 'SF Mono', 'Fira Code', Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  flex: 1;
  overflow-y: auto;
}

.diff-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #84848a;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #27272a;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.diff-line {
  display: flex;
  padding: 2px 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #d4d4d8;
}

.diff-line.add {
  background: rgba(34, 197, 94, 0.2);
}

.diff-line.add .line-sign {
  color: #22c55e;
}

.diff-line.add .line-text {
  color: #4ade80;
}

.diff-line.del {
  background: rgba(239, 68, 68, 0.2);
}

.diff-line.del .line-sign {
  color: #ef4444;
}

.diff-line.del .line-text {
  color: #f87171;
}

.diff-line.context {
  color: #9ca3af;
}

.diff-line.context .line-text {
  color: #9ca3af;
}

.diff-line.header {
  background: #121212;
  color: #3b82f6;
}

.diff-line.header .line-text {
  color: #3b82f6;
}

.line-num {
  width: 40px;
  text-align: right;
  padding-right: 12px;
  color: #6b7280;
  user-select: none;
  flex-shrink: 0;
}

.line-sign {
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  color: #9ca3af;
}

.line-sign.add {
  color: #22c55e;
}

.line-sign.del {
  color: #ef4444;
}

.line-text {
  flex: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: var(--bg-secondary, #121212);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon i {
  font-size: 32px;
  color: var(--text-muted, #84848a);
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted, #84848a);
}

.bottom-actions {
  background: var(--bg-secondary, #121212);
  border-top: 1px solid var(--border-color, #27272a);
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: var(--accent, #3b82f6);
  color: white;
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger, #ef4444);
}

.action-btn.secondary {
  background: var(--bg-tertiary, #18191b);
  color: var(--text-primary, #f4f4f5);
  border: 1px solid var(--border-color, #27272a);
}

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
  z-index: 999;
}

.drawer-overlay.show {
  opacity: 1;
  visibility: visible;
}

.commit-drawer {
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
  z-index: 1000;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.commit-drawer.show {
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

.commit-form {
  padding: 16px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary, #d4d4d8);
  margin-bottom: 8px;
}

.form-group textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-tertiary, #18191b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 8px;
  color: var(--text-primary, #f4f4f5);
  font-size: 14px;
  resize: none;
  outline: none;
}

.form-group textarea:focus {
  border-color: var(--accent, #3b82f6);
}

.form-group textarea::placeholder {
  color: var(--text-muted, #84848a);
}

.commit-preview {
  background: var(--bg-tertiary, #18191b);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.preview-title {
  font-size: 13px;
  color: var(--text-muted, #84848a);
  margin-bottom: 8px;
}

.preview-stats {
  display: flex;
  gap: 16px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: var(--accent, #3b82f6);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>