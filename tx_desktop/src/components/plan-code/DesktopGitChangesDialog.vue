<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <div class="header-left">
          <span class="header-icon">&#x2387;</span>
          <span>Git 变更</span>
        </div>
        <div class="header-actions">
          <button class="btn-icon" @click="refresh" :disabled="loading" title="刷新">&#x21BB;</button>
          <button class="btn-icon" @click="revertAll" :disabled="changes.length === 0 || diffLoading" title="撤销全部">&#x21B6;</button>
          <button class="dialog-close" @click="$emit('close')">&times;</button>
        </div>
      </div>

      <div class="dialog-body">
        <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
          <DesktopGitChangeList
            v-if="isRepo"
            :changes="changes"
            :selected-path="selectedPath"
            :loading="loading"
            :stats-map="statsMap"
            @select="selectChange"
            @refresh="refresh"
            @revert="revertFile"
          />
          <div v-else class="empty-state">
            <p>当前目录不是 Git 仓库</p>
          </div>
        </div>

        <div class="resize-handle" @mousedown="startResize"></div>

        <div class="diff-panel">
          <div v-if="!selectedChange" class="empty-state">
            <p>点击文件查看变更详情</p>
          </div>
          <template v-else>
            <div class="action-bar">
              <span class="change-badge" :class="'badge-' + selectedChange.status">{{ selectedChange.statusCode || statusLabel(selectedChange) }}</span>
              <span class="action-path">{{ selectedChange.path }}</span>
            </div>
            <div class="diff-area-inner">
              <DesktopGitDiffPanel
                v-if="diffData || diffLoading"
                :change="selectedChange"
                :diff-data="diffData"
                :loading="diffLoading"
                :view-mode.sync="viewMode"
                :folded.sync="folded"
                @refresh="refresh"
              />
              <div v-if="diffLoading" class="diff-loading">加载差异中...</div>
              <div v-else-if="!diffData" class="empty-state">
                <p>无法显示差异</p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="confirmVisible" class="overlay confirm-overlay" @click.self="cancelConfirm">
      <div class="confirm-dialog">
        <div class="confirm-header">确认操作</div>
        <div class="confirm-body">{{ confirmMessage }}</div>
        <div class="confirm-footer">
          <button class="btn-outline" @click="cancelConfirm">取消</button>
          <button class="btn-danger" @click="executeConfirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { gitIsRepo, gitStatus, gitDiffFull, gitRevert, gitRevertAll, gitDeleteFile, gitDiscardUntracked } from '@/api/index'
import DesktopGitChangeList from '@/components/git/DesktopGitChangeList.vue'
import DesktopGitDiffPanel from '@/components/git/DesktopGitDiffPanel.vue'

export default {
  name: 'DesktopGitChangesDialog',
  components: {
    DesktopGitChangeList,
    DesktopGitDiffPanel
  },
  emits: ['close'],
  data() {
    return {
      isRepo: false,
      changes: [],
      selectedChange: null,
      diffData: null,
      loading: false,
      diffLoading: false,
      sidebarWidth: 320,
      isResizing: false,
      viewMode: 'split',
      folded: false,
      statsMap: {},
      confirmVisible: false,
      confirmMessage: '',
      confirmAction: null,
      confirmTarget: null
    }
  },
  computed: {
    selectedPath() {
      return this.selectedChange ? this.selectedChange.path : ''
    }
  },
  mounted() {
    this.init()
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
  },
  methods: {
    async init() {
      this.loading = true
      try {
        const repoRes = await gitIsRepo()
        this.isRepo = repoRes.data?.isRepo || false
        if (this.isRepo) {
          await this.refresh()
          if (this.changes.length > 0 && !this.selectedChange) {
            this.selectChange(this.changes[0])
          }
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
        this.changes = (r.data || []).filter(c => !/[/\\]$/.test(String(c.path || '')))
        if (this.selectedChange) {
          const still = this.changes.find(c => c.path === this.selectedChange.path)
          if (still) {
            this.selectedChange = still
          } else {
            this.selectedChange = null
            this.diffData = null
          }
        }
        if (!this.selectedChange && this.changes.length > 0) {
          this.selectChange(this.changes[0])
        } else if (this.selectedChange) {
          this.loadDiff(this.selectedChange)
        }
      } catch (e) {
        console.error('Git status error:', e)
      } finally {
        this.loading = false
      }
    },
    selectChange(change) {
      this.selectedChange = change
      this.loadDiff(change)
    },
    async loadDiff(change) {
      const prev = this.diffData
      this.diffLoading = true
      this.diffData = null
      try {
        const r = await gitDiffFull(change.path, { staged: change.staged })
        this.diffData = r.data || null
        if (r.data) {
          const map = { ...this.statsMap }
          map[change.path] = r.data.stats
          this.statsMap = map
        }
      } catch (e) {
        this.diffData = prev
        console.error('加载差异失败:', e)
      } finally {
        this.diffLoading = false
      }
    },
    revertFile(change) {
      const isNew = change.isNew || change.status === 'untracked'
      this.confirmMessage = isNew
        ? `确定要删除未跟踪的文件 "${change.path}" 吗？`
        : `确定要撤销对 "${change.path}" 的修改吗？`
      this.confirmAction = isNew ? 'delete' : 'revert'
      this.confirmTarget = change
      this.confirmVisible = true
    },
    revertAll() {
      if (this.changes.length === 0) return
      this.confirmMessage = `确定要撤销所有 ${this.changes.length} 个文件的变更吗？此操作不可恢复。`
      this.confirmAction = 'revertAll'
      this.confirmTarget = null
      this.confirmVisible = true
    },
    cancelConfirm() {
      this.confirmVisible = false
    },
    async executeConfirm() {
      this.confirmVisible = false
      try {
        if (this.confirmAction === 'revertAll') {
          await gitRevertAll()
          await gitDiscardUntracked()
        } else if (this.confirmAction === 'revert') {
          await gitRevert(this.confirmTarget.path)
        } else if (this.confirmAction === 'delete') {
          await gitDeleteFile(this.confirmTarget.path)
        }
        await this.refresh()
      } catch (e) {
        alert('操作失败: ' + (e.message || '未知错误'))
      }
    },
    statusLabel(change) {
      if (change.status === 'added' || change.isNew) return '新增'
      if (change.status === 'deleted') return '删除'
      if (change.status === 'renamed') return '重命名'
      if (change.status === 'untracked') return '未跟踪'
      return '修改'
    },
    startResize(e) {
      this.isResizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    handleResize(e) {
      if (!this.isResizing) return
      const rect = this.$el.querySelector('.dialog')?.getBoundingClientRect()
      if (rect) {
        const newWidth = e.clientX - rect.left
        if (newWidth >= 200 && newWidth <= 500) {
          this.sidebarWidth = newWidth
        }
      }
    },
    stopResize() {
      this.isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
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
  width: 90vw; max-width: 1400px; height: 85vh; max-height: 900px; min-height: 500px;
  display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 8px; }
.header-icon { font-size: 16px; }
.header-actions { display: flex; align-items: center; gap: 4px; }
.btn-icon {
  width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);
  font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.btn-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
.dialog-close {
  width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }

.dialog-body {
  flex: 1; display: flex; overflow: hidden; min-height: 0;
}

/* Sidebar */
.sidebar {
  min-width: 200px; max-width: 500px;
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  background: #fafbfc;
  flex-shrink: 0;
  overflow: hidden;
}
.change-badge {
  font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
  color: #fff; flex-shrink: 0; text-align: center; min-width: 32px;
}
.badge-modified { background: #3b82f6; }
.badge-added { background: #22c55e; }
.badge-deleted { background: #ef4444; }
.badge-untracked { background: #6b7280; }
.badge-renamed { background: #8b5cf6; }

/* Resize handle */
.resize-handle {
  width: 1px; background: var(--border); cursor: col-resize; flex-shrink: 0;
  transition: background 0.15s;
}
.resize-handle:hover { background: var(--accent); width: 3px; }

/* Diff panel */
.diff-panel {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
}

/* Action bar */
.action-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-bottom: 1px solid var(--border);
  background: var(--bg-titlebar); flex-shrink: 0;
}
.action-path { font-size: 13px; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Diff panel inner */
.diff-area-inner {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
  position: relative;
}
.diff-loading {
  position: absolute; inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--text-muted); z-index: 10;
}

.empty-state {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 13px; padding: 40px;
}

/* Confirm dialog */
.confirm-overlay { z-index: 1200; }
.confirm-dialog {
  background: #fff; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  width: 400px; max-width: 90vw; padding: 20px;
}
.confirm-header { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.confirm-body { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5; }
.confirm-footer { display: flex; justify-content: flex-end; gap: 8px; }
.btn-outline {
  padding: 6px 16px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 13px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-danger {
  padding: 6px 16px; background: #ef4444; color: #fff; border: none; border-radius: 5px;
  font-size: 13px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-danger:hover { background: #dc2626; }
</style>
