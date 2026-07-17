<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>Git 变更</span>
        <div class="header-actions">
          <button class="btn-outline-sm" @click="refresh" :disabled="loading">刷新</button>
          <button class="dialog-close" @click="$emit('close')">&times;</button>
        </div>
      </div>
      <div class="dialog-body">
        <div v-if="!isRepo && !loading" class="empty-hint">当前项目不是 Git 仓库</div>
        <div v-else-if="loading" class="loading-hint">加载中...</div>
        <div v-else-if="changes.length === 0" class="empty-hint">没有文件变更</div>
        <div v-else class="change-list">
          <div
            v-for="change in changes"
            :key="change.path"
            class="change-item"
            :class="{ selected: selectedChange === change }"
            @click="selectChange(change)"
          >
            <span class="change-status" :class="statusClass(change)">{{ statusLabel(change) }}</span>
            <span class="change-path">{{ change.path }}</span>
            <span class="change-type" v-if="change.changeType">{{ change.changeType }}</span>
          </div>
        </div>
      </div>
      <div v-if="selectedChange" class="diff-section">
        <div class="diff-header">
          <span>{{ selectedChange.path }}</span>
          <button class="action-btn" @click="revertFile(selectedChange)" v-if="!selectedChange.isNew && !selectedChange.isDeleted">撤销</button>
        </div>
        <div class="diff-content" v-if="diffLoading">加载差异中...</div>
        <pre class="diff-content" v-else-if="diffContent">{{ diffContent }}</pre>
        <div class="diff-content" v-else>无差异</div>
      </div>
      <div class="dialog-footer" v-if="changes.length > 0">
        <span class="change-count">{{ changes.length }} 个文件变更</span>
        <button class="btn-outline" @click="$emit('close')">关闭</button>
        <button class="btn-danger" @click="revertAll" :disabled="diffLoading">撤销全部</button>
      </div>
      <div class="dialog-footer" v-else>
        <button class="btn-outline" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
import { gitIsRepo, gitStatus, gitDiff, gitRevert, gitRevertAll, gitDeleteFile, gitDiscardUntracked } from '@/api/index'

export default {
  name: 'DesktopGitChangesDialog',
  emits: ['close'],
  data() {
    return {
      isRepo: false,
      changes: [],
      selectedChange: null,
      diffContent: '',
      loading: false,
      diffLoading: false
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    async init() {
      this.loading = true
      try {
        const repoRes = await gitIsRepo()
        this.isRepo = repoRes.data?.isRepo || false
        if (this.isRepo) {
          await this.refresh()
        }
      } catch (e) {
        this.isRepo = false
      } finally {
        this.loading = false
      }
    },
    async refresh() {
      this.loading = true
      try {
        const r = await gitStatus()
        this.changes = r.data || []
        if (this.selectedChange) {
          const still = this.changes.find(c => c.path === this.selectedChange.path)
          if (!still) {
            this.selectedChange = null
            this.diffContent = ''
          }
        }
      } catch (e) {
        console.error('Git status error:', e)
      } finally {
        this.loading = false
      }
    },
    async selectChange(change) {
      this.selectedChange = change
      this.diffLoading = true
      this.diffContent = ''
      try {
        const r = await gitDiff(change.path, change.isNew)
        this.diffContent = (r.data && r.data.diff) || ''
      } catch (e) {
        this.diffContent = ''
      } finally {
        this.diffLoading = false
      }
    },
    async revertFile(change) {
      if (!confirm(`确定撤销 "${change.path}" 的修改吗？`)) return
      try {
        await gitRevert(change.path)
        await this.refresh()
      } catch (e) {
        alert('撤销失败: ' + e.message)
      }
    },
    async revertAll() {
      if (!confirm(`确定撤销所有 ${this.changes.length} 个文件的变更吗？`)) return
      try {
        await gitRevertAll()
        await gitDiscardUntracked()
        await this.refresh()
        this.selectedChange = null
        this.diffContent = ''
      } catch (e) {
        alert('撤销全部失败: ' + e.message)
      }
    },
    statusLabel(change) {
      if (change.isNew) return '新增'
      if (change.isDeleted) return '删除'
      if (change.isRenamed) return '重命名'
      return '修改'
    },
    statusClass(change) {
      if (change.isNew) return 'added'
      if (change.isDeleted) return 'deleted'
      return 'modified'
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
  width: 700px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.header-actions { display: flex; align-items: center; gap: 6px; }
.btn-outline-sm {
  padding: 3px 10px; font-size: 11px; background: #fff; color: var(--text-secondary);
  border: 1px solid var(--border); border-radius: 4px; cursor: pointer; font-family: inherit;
}
.btn-outline-sm:hover { background: var(--bg-hover); }
.btn-outline-sm:disabled { opacity: 0.5; cursor: not-allowed; }
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 4px; max-height: 260px; }
.change-list { }
.change-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; cursor: pointer; border-radius: 4px;
  font-size: 13px; transition: background 0.15s;
}
.change-item:hover { background: var(--bg-hover); }
.change-item.selected { background: var(--accent-light); }
.change-status {
  font-size: 11px; padding: 1px 6px; border-radius: 3px; font-weight: 600; flex-shrink: 0;
  min-width: 36px; text-align: center;
}
.change-status.added { background: #dcfce7; color: #16a34a; }
.change-status.modified { background: #fef3c7; color: #d97706; }
.change-status.deleted { background: #fee2e2; color: #dc2626; }
.change-path { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
.change-type { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }

.diff-section { border-top: 1px solid var(--border); }
.diff-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; font-size: 12px; color: var(--text-secondary);
  background: var(--bg-titlebar); border-bottom: 1px solid var(--border);
}
.action-btn {
  padding: 2px 8px; font-size: 11px; background: #fff; color: #dc2626;
  border: 1px solid #fecaca; border-radius: 3px; cursor: pointer; font-family: inherit;
}
.action-btn:hover { background: #fee2e2; }
.diff-content {
  padding: 12px 16px; font-size: 12px; font-family: 'JetBrains Mono', monospace;
  max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
  color: var(--text-primary); margin: 0;
}
.diff-content pre { margin: 0; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.change-count { font-size: 12px; color: var(--text-muted); margin-right: auto; }
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-danger {
  padding: 6px 14px; background: #ef4444; color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-danger:hover { background: #dc2626; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.empty-hint, .loading-hint {
  text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;
}
</style>
