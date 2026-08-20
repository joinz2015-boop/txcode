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
          <div v-if="loading" class="empty-state">加载中...</div>
          <div v-else-if="!isRepo" class="empty-state">
            <p>当前目录不是 Git 仓库</p>
          </div>
          <div v-else-if="changes.length === 0" class="empty-state">
            <p>没有待提交的变更</p>
          </div>
          <div v-else class="change-list">
            <div
              v-for="change in changes"
              :key="change.path"
              class="change-item"
              :class="{ selected: selectedChange && selectedChange.path === change.path }"
              @click="selectChange(change)"
            >
              <span class="change-badge" :class="'badge-' + change.status">{{ change.statusCode || statusLabel(change) }}</span>
              <div class="change-info">
                <div class="change-name">{{ getFileName(change.path) }}</div>
                <div class="change-dir">{{ getDirPath(change.path) }}</div>
              </div>
              <div class="change-actions" @click.stop>
                <button class="mini-btn" @click="openFile(change)" title="打开文件">&#x2197;</button>
                <button class="mini-btn revert" @click="revertFile(change)" title="撤销">&#x21B6;</button>
              </div>
            </div>
          </div>
          <div class="sidebar-footer" v-if="changes.length > 0">
            {{ changes.length }} 个文件变更
          </div>
        </div>

        <div class="resize-handle" @mousedown="startResize"></div>

        <div class="diff-panel">
          <div v-if="!selectedChange" class="empty-state">
            <p>点击文件查看变更详情</p>
          </div>
          <template v-else>
            <div class="diff-toolbar">
              <span class="change-badge" :class="'badge-' + selectedChange.status">{{ selectedChange.statusCode || statusLabel(selectedChange) }}</span>
              <span class="diff-path">{{ selectedChange.path }}</span>
              <div class="diff-actions">
                <button class="action-btn open" @click="openFile(selectedChange)">打开文件</button>
                <button class="action-btn revert" @click="revertFile(selectedChange)">撤销</button>
              </div>
            </div>
            <div v-if="diffLoading" class="empty-state">加载差异中...</div>
            <div v-else-if="diffContent" class="diff-split">
              <div class="diff-side">
                <div class="diff-side-header">旧版本 (Original)</div>
                <div class="diff-side-body">
                  <div
                    v-for="(line, idx) in oldLines"
                    :key="'old-' + idx"
                    class="diff-line"
                    :class="getLineClass(line)"
                  >
                    <span class="line-num">{{ line.lineNum || '' }}</span>
                    <span class="line-prefix">{{ getLinePrefix(line) }}</span>
                    <span class="line-content">{{ line.content }}</span>
                  </div>
                </div>
              </div>
              <div class="diff-side">
                <div class="diff-side-header">新版本 (Modified)</div>
                <div class="diff-side-body">
                  <div
                    v-for="(line, idx) in newLines"
                    :key="'new-' + idx"
                    class="diff-line"
                    :class="getLineClass(line)"
                  >
                    <span class="line-num">{{ line.lineNum || '' }}</span>
                    <span class="line-prefix">{{ getLinePrefix(line) }}</span>
                    <span class="line-content">{{ line.content }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">无法显示差异</div>
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
import { gitIsRepo, gitStatus, gitDiff, gitRevert, gitRevertAll, gitDeleteFile, gitDiscardUntracked } from '@/api/index'

export default {
  name: 'DesktopGitChangesDialog',
  emits: ['close', 'open-file'],
  data() {
    return {
      isRepo: false,
      changes: [],
      selectedChange: null,
      diffContent: '',
      loading: false,
      diffLoading: false,
      sidebarWidth: 320,
      isResizing: false,
      oldLines: [],
      newLines: [],
      confirmVisible: false,
      confirmMessage: '',
      confirmAction: null,
      confirmTarget: null
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
        this.changes = r.data || []
        if (this.selectedChange) {
          const still = this.changes.find(c => c.path === this.selectedChange.path)
          if (!still) {
            this.selectedChange = null
            this.diffContent = ''
            this.oldLines = []
            this.newLines = []
          } else if (still) {
            this.selectedChange = still
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
      this.oldLines = []
      this.newLines = []
      try {
        const r = await gitDiff(change.path, change.isNew)
        this.diffContent = (r.data && r.data.diff) || ''
        this.parseDiff(this.diffContent)
      } catch (e) {
        this.diffContent = ''
      } finally {
        this.diffLoading = false
      }
    },
    openFile(change) {
      this.$emit('open-file', change.path)
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
    statusCodeLabel(change) {
      return change.statusCode || this.statusLabel(change)
    },
    getFileName(filePath) {
      return filePath.split('/').pop() || filePath.split('\\').pop() || filePath
    },
    getDirPath(filePath) {
      const parts = filePath.replace(/\\/g, '/').split('/')
      parts.pop()
      return parts.join('/') || '.'
    },
    getLinePrefix(line) {
      if (line.removed) return '-'
      if (line.added) return '+'
      return ' '
    },
    getLineClass(line) {
      if (line.type === 'header') return 'diff-header'
      if (line.removed) return 'diff-removed'
      if (line.added) return 'diff-added'
      if (line.empty) return 'diff-empty'
      return 'diff-normal'
    },
    parseDiff(diff) {
      this.oldLines = []
      this.newLines = []
      if (!diff) return
      const lines = diff.split('\n')
      let oldLineNum = 1
      let newLineNum = 1
      for (const line of lines) {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
          if (match) {
            oldLineNum = parseInt(match[1])
            newLineNum = parseInt(match[2])
          }
          this.oldLines.push({ lineNum: '', content: line, type: 'header' })
          this.newLines.push({ lineNum: '', content: line, type: 'header' })
        } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ') || line.startsWith('index ')) {
        } else if (line.startsWith('-')) {
          this.oldLines.push({ lineNum: oldLineNum++, content: line.substring(1), removed: true })
          this.newLines.push({ lineNum: '', content: '', empty: true })
        } else if (line.startsWith('+')) {
          this.oldLines.push({ lineNum: '', content: '', empty: true })
          this.newLines.push({ lineNum: newLineNum++, content: line.substring(1), added: true })
        } else {
          this.oldLines.push({ lineNum: oldLineNum++, content: line })
          this.newLines.push({ lineNum: newLineNum++, content: line })
        }
      }
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
}
.change-list { flex: 1; overflow-y: auto; }
.change-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.04);
  font-size: 13px; transition: background 0.1s;
}
.change-item:hover { background: var(--bg-hover); }
.change-item.selected { background: var(--accent-light); border-left: 2px solid var(--accent); padding-left: 10px; }
.change-badge {
  font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
  color: #fff; flex-shrink: 0; text-align: center; min-width: 32px;
}
.badge-modified { background: #3b82f6; }
.badge-added { background: #22c55e; }
.badge-deleted { background: #ef4444; }
.badge-untracked { background: #6b7280; }
.badge-renamed { background: #8b5cf6; }
.change-info { flex: 1; min-width: 0; }
.change-name { color: var(--text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.change-dir { color: var(--text-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.change-actions { display: flex; gap: 2px; flex-shrink: 0; }
.mini-btn {
  width: 22px; height: 22px; border: none; background: transparent;
  color: var(--text-muted); font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; border-radius: 3px;
}
.mini-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.mini-btn.revert:hover { color: #ef4444; }
.sidebar-footer {
  padding: 8px 12px; border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-muted); flex-shrink: 0;
}

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
.diff-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-bottom: 1px solid var(--border);
  background: var(--bg-titlebar); flex-shrink: 0;
}
.diff-path { font-size: 13px; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diff-actions { display: flex; gap: 6px; flex-shrink: 0; }
.action-btn {
  padding: 4px 12px; border: none; border-radius: 4px; font-size: 12px;
  cursor: pointer; font-family: inherit; font-weight: 500;
}
.action-btn.open { background: #3b82f6; color: #fff; }
.action-btn.open:hover { background: #2563eb; }
.action-btn.revert { background: #eab308; color: #fff; }
.action-btn.revert:hover { background: #ca8a04; }

/* Diff split view */
.diff-split {
  flex: 1; display: flex; overflow: hidden; min-height: 0;
}
.diff-side {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
  border-right: 1px solid var(--border);
}
.diff-side:last-child { border-right: none; }
.diff-side-header {
  padding: 6px 12px; background: var(--bg-titlebar); border-bottom: 1px solid var(--border);
  font-size: 12px; font-weight: 600; color: var(--text-secondary); flex-shrink: 0;
}
.diff-side-body {
  flex: 1; overflow: auto; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px;
  line-height: 1.5; background: #fafbfc;
}
.diff-line {
  display: flex; min-height: 18px;
}
.diff-line.diff-header { background: #eff6ff; color: #3b82f6; }
.diff-line.diff-removed { background: #fef2f2; color: #dc2626; }
.diff-line.diff-added { background: #f0fdf4; color: #16a34a; }
.diff-line.diff-empty { background: #f9fafb; }
.diff-line.diff-normal { color: var(--text-primary); }
.line-num {
  width: 40px; text-align: right; padding-right: 8px; color: var(--text-muted);
  flex-shrink: 0; user-select: none; font-size: 11px;
}
.line-prefix {
  width: 16px; text-align: center; flex-shrink: 0; user-select: none;
  font-weight: 700;
}
.line-content { flex: 1; white-space: pre; overflow-x: auto; }

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
