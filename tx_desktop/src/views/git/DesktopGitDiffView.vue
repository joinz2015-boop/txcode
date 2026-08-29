<template>
  <div class="gitdiff-view">
    <div class="gitdiff-main">
      <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <DesktopGitChangeList
          :changes="changes"
          :selected-path="selectedPath"
          :loading="loading"
          :stats-map="statsMap"
          @select="selectChange"
          @refresh="refresh"
          @revert="revertFile"
        />
      </div>

      <div class="resizer" :class="{ dragging: resizing }" @mousedown="startResize"></div>

      <div class="diff-area">
        <div v-if="!isRepo" class="empty-state">
          <p class="empty-title">当前目录不是 Git 仓库</p>
          <p class="empty-sub">请切换到 Git 项目后重试</p>
        </div>
        <div v-else-if="changes.length === 0 && !loading" class="empty-state">
          <p class="empty-title">没有待提交的变更</p>
        </div>
        <div v-else-if="!selectedChange" class="empty-state">
          <p class="empty-title">点击左侧文件查看变更详情</p>
        </div>
        <div v-else class="diff-area-inner">
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
            <p class="empty-title">无法加载差异</p>
          </div>
        </div>
      </div>
    </div>

    <div class="gitdiff-toasts">
      <div v-for="t in toasts" :key="t.id" class="gitdiff-toast" :class="t.type">{{ t.msg }}</div>
    </div>

    <div v-if="confirmVisible" class="confirm-overlay" @click.self="cancelConfirm">
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
import { gitIsRepo, gitStatus, gitDiffFull, gitRevert, gitDeleteFile } from '@/api/index'
import DesktopGitChangeList from '@/components/git/DesktopGitChangeList.vue'
import DesktopGitDiffPanel from '@/components/git/DesktopGitDiffPanel.vue'

export default {
  name: 'DesktopGitDiffView',
  components: {
    DesktopGitChangeList,
    DesktopGitDiffPanel
  },
  data() {
    return {
      isRepo: false,
      changes: [],
      selectedChange: null,
      diffData: null,
      loading: false,
      diffLoading: false,
      sidebarWidth: 280,
      resizing: false,
      viewMode: 'split',
      folded: false,
      statsMap: {},
      toasts: [],
      toastId: 0,
      confirmVisible: false,
      confirmMessage: '',
      confirmAction: '',
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
  },
  beforeDestroy() {},
  methods: {
    async init() {
      this.loading = true
      try {
        const repoRes = await gitIsRepo()
        this.isRepo = !!(repoRes.data && repoRes.data.isRepo)
        if (this.isRepo) {
          const r = await gitStatus()
          this.changes = r.data || []
          if (this.changes.length > 0) {
            this.selectChange(this.changes[0])
          }
        }
      } catch (e) {
        this.isRepo = false
        this.pushToast('初始化失败: ' + (e.message || e), 'err')
      } finally {
        this.loading = false
      }
    },
    async refresh() {
      this.loading = true
      try {
        const repoRes = await gitIsRepo()
        this.isRepo = !!(repoRes.data && repoRes.data.isRepo)
        if (!this.isRepo) {
          this.changes = []
          this.selectedChange = null
          this.diffData = null
          return
        }
        const r = await gitStatus()
        this.changes = r.data || []
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
        this.pushToast('刷新失败: ' + (e.message || e), 'err')
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
        this.pushToast('加载差异失败: ' + (e.message || e), 'err')
      } finally {
        this.diffLoading = false
      }
    },
    startResize(e) {
      this.resizing = true
      const startX = e.clientX
      const startW = this.sidebarWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        this.sidebarWidth = Math.max(220, Math.min(400, startW + (ev.clientX - startX)))
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
    pushToast(msg, type) {
      const id = ++this.toastId
      this.toasts.push({ id, msg: msg || '', type: type === 'err' ? 'err' : 'ok' })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, 2400)
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
    cancelConfirm() {
      this.confirmVisible = false
    },
    async executeConfirm() {
      const target = this.confirmTarget
      const action = this.confirmAction
      this.confirmVisible = false
      try {
        if (action === 'revert') {
          await gitRevert(target.path)
        } else if (action === 'delete') {
          await gitDeleteFile(target.path)
        }
        await this.refresh()
        this.pushToast(`已撤销 ${target.path}`, 'ok')
      } catch (e) {
        this.pushToast('撤销失败: ' + (e.message || e), 'err')
      }
    }
  }
}
</script>

<style scoped>
.gitdiff-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-window);
}
.gitdiff-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.sidebar {
  min-width: 220px;
  max-width: 400px;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}
.resizer {
  width: 3px;
  cursor: col-resize;
  flex-shrink: 0;
  background: transparent;
  transition: background 0.15s;
}
.resizer:hover,
.resizer.dragging {
  background: var(--accent);
  opacity: 0.5;
}
.diff-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-chat);
  overflow: hidden;
  min-width: 0;
}
.diff-area-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  position: relative;
}
.diff-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-muted);
  z-index: 10;
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 40px;
  gap: 6px;
}
.empty-title {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}
.empty-sub {
  margin: 0;
  font-size: 12px;
}
.gitdiff-toasts {
  position: fixed;
  bottom: 48px;
  right: 20px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}
.gitdiff-toast {
  background: #1f2430;
  color: #fff;
  font-size: 12.5px;
  padding: 8px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 8px;
  animation: toastIn 0.2s ease;
  max-width: 360px;
}
.gitdiff-toast.ok::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  flex-shrink: 0;
}
.gitdiff-toast.err::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Confirm dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  width: 400px;
  max-width: 90vw;
  padding: 20px;
}
.confirm-header {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.confirm-body {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}
.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-outline {
  padding: 6px 16px;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.btn-outline:hover {
  background: var(--bg-hover);
}
.btn-danger {
  padding: 6px 16px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}
.btn-danger:hover {
  background: #dc2626;
}
</style>
