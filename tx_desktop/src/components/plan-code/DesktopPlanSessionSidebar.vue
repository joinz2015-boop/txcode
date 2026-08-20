<template>
  <div class="sidebar-panel">
    <div class="sidebar-header">
      <span class="sidebar-title">会话列表</span>
      <button class="sidebar-new-btn" @click="$emit('create')">+ 新建</button>
    </div>
    <div class="sidebar-content">
      <div v-if="sessions.length === 0" class="sidebar-empty">
        <p>暂无计划会话</p>
        <button class="sidebar-new-btn" @click="$emit('create')">+ 新建</button>
      </div>
      <div
        v-for="session in displayedSessions"
        :key="session.folderName"
        class="session-item"
        :class="{ active: currentFolderName === session.folderName }"
        @click="$emit('select', session)"
      >
        <div class="session-title">{{ session.meta.sessionName || session.folderName }}</div>
        <div class="session-time">{{ formatTime(session.meta.updatedAt || session.meta.createdAt) }}</div>
        <span v-if="isSessionRunning(session)" class="session-spinner"></span>
        <span class="session-menu" @click.stop="toggleMenu(session, $event)">⋮</span>
      </div>
      <div v-if="hasMore" class="load-more-item" @click="loadMore">
        加载更多 ({{ sessions.length - displayCount }})
      </div>
      <div v-else-if="sessions.length > pageSize" class="load-more-item disabled">
        已加载全部
      </div>
    </div>

    <div v-if="menuTarget" class="sidebar-menu-popup" :style="menuStyle">
      <div class="menu-item" @click="startRename">重命名</div>
      <div class="menu-item danger" @click="confirmDelete">删除</div>
    </div>

    <div class="overlay" v-if="renameDialogVisible" @click.self="renameDialogVisible = false">
      <div class="rename-dialog">
        <div class="dialog-header">
          <span>重命名会话</span>
          <button class="dialog-close" @click="renameDialogVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <input
            class="dialog-input"
            v-model="renameValue"
            placeholder="请输入新名称"
            @keydown.enter="doRename"
            ref="renameInput"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="renameDialogVisible = false">取消</button>
          <button class="btn-primary" @click="doRename" :disabled="!renameValue.trim()">确定</button>
        </div>
      </div>
    </div>

    <div class="overlay" v-if="deleteDialogVisible" @click.self="deleteDialogVisible = false">
      <div class="confirm-dialog">
        <div class="dialog-header">
          <span>确认删除</span>
          <button class="dialog-close" @click="deleteDialogVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <p class="confirm-text">
            确定要删除会话「{{ deleteTarget ? (deleteTarget.meta.sessionName || deleteTarget.folderName) : '' }}」吗？此操作不可恢复。
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="deleteDialogVisible = false">取消</button>
          <button class="btn-danger" @click="doDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopPlanSessionSidebar',
  props: {
    sessions: { type: Array, default: () => [] },
    currentFolderName: { type: String, default: '' },
    runningSessionIds: { type: Array, default: () => [] }
  },
  emits: ['create', 'select', 'rename', 'delete'],
  data() {
    return {
      menuTarget: null,
      menuStyle: {},
      renameDialogVisible: false,
      renameValue: '',
      renameTarget: null,
      deleteDialogVisible: false,
      deleteTarget: null,
      displayCount: 10,
      pageSize: 10
    }
  },
  computed: {
    displayedSessions() {
      return this.sessions.slice(0, this.displayCount)
    },
    hasMore() {
      return this.displayCount < this.sessions.length
    }
  },
  watch: {
    sessions() {
      this.displayCount = this.pageSize
    },
    renameDialogVisible(val) {
      if (val) {
        this.$nextTick(() => {
          if (this.$refs.renameInput) {
            this.$refs.renameInput.focus()
            this.$refs.renameInput.select()
          }
        })
      }
    }
  },
  mounted() {
    document.addEventListener('mousedown', this.onMouseDown)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onMouseDown)
  },
  methods: {
    onMouseDown(e) {
      if (this.menuTarget && !e.target.closest('.sidebar-menu-popup') && !e.target.closest('.session-menu')) {
        this.menuTarget = null
      }
    },
    toggleMenu(session, event) {
      if (this.menuTarget === session) { this.menuTarget = null; return }
      this.menuTarget = session
      const rect = event.target.getBoundingClientRect()
      this.menuStyle = { position: 'fixed', top: (rect.bottom + 4) + 'px', left: (rect.left - 100) + 'px' }
    },
    startRename() {
      this.renameTarget = this.menuTarget
      this.renameValue = this.menuTarget.meta.sessionName || this.menuTarget.folderName
      this.menuTarget = null
      this.renameDialogVisible = true
    },
    doRename() {
      if (!this.renameValue.trim() || !this.renameTarget) return
      this.$emit('rename', this.renameTarget, this.renameValue.trim())
      this.renameDialogVisible = false
      this.renameTarget = null
    },
    confirmDelete() {
      this.deleteTarget = this.menuTarget
      this.menuTarget = null
      this.deleteDialogVisible = true
    },
    doDelete() {
      if (!this.deleteTarget) return
      this.$emit('delete', this.deleteTarget)
      this.deleteDialogVisible = false
      this.deleteTarget = null
    },
    loadMore() {
      this.displayCount = Math.min(this.displayCount + this.pageSize, this.sessions.length)
    },
    formatTime(dateStr) {
      if (!dateStr) return ''
      try {
        const d = new Date(dateStr)
        const now = new Date()
        const diff = now - d
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
        return d.toLocaleDateString()
      } catch { return '' }
    },
    isSessionRunning(session) {
      if (!this.runningSessionIds || !this.runningSessionIds.length) return false
      const meta = session.meta || {}
      const ids = [
        meta.codeSessionId,
        meta.designSessionId,
        meta.testSessionId
      ].filter(Boolean)
      const discussSessions = meta.discussSessions || []
      for (const d of discussSessions) {
        if (d.sessionId) ids.push(d.sessionId)
      }
      return ids.some(id => this.runningSessionIds.includes(id))
    }
  }
}
</script>

<style scoped>
.sidebar-panel {
  width: 250px;
  min-width: 250px;
  background: var(--bg-side);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  flex-shrink: 0;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
}
.sidebar-title {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sidebar-new-btn {
  font-size: 12px;
  padding: 5px 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}
.sidebar-new-btn:hover { background: #4752c4; }
.sidebar-content { flex: 1; overflow-y: auto; }
.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 16px;
  color: var(--text-muted);
  font-size: 13px;
}

.session-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted);
  border-left: 2px solid transparent;
  transition: all 0.15s;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.session-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.session-item.active {
  background: var(--accent-light);
  border-left-color: var(--accent);
  color: var(--accent);
}
.session-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; padding-right: 24px; }
.session-time { font-size: 11px; color: var(--text-muted); }

.session-menu {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
  opacity: 0;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.session-item:hover .session-menu { opacity: 1; }
.session-menu:hover { background: var(--border); color: var(--text-primary); }

.session-spinner {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

.load-more-item {
  padding: 7px 16px;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  text-align: center;
}
.load-more-item:hover { background: var(--bg-hover); }
.load-more-item.disabled { color: var(--text-muted); cursor: default; }

.sidebar-menu-popup {
  position: fixed;
  z-index: 200;
  min-width: 100px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  padding: 4px;
}
.sidebar-menu-popup .menu-item {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--text-primary);
}
.sidebar-menu-popup .menu-item:hover { background: var(--bg-hover); }
.sidebar-menu-popup .menu-item.danger { color: #ef4444; }
.sidebar-menu-popup .menu-item.danger:hover { background: #fef2f2; }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.rename-dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 400px; max-width: 90vw;
}
.confirm-dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 380px; max-width: 90vw;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { padding: 16px; }
.dialog-input {
  width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none;
  font-family: inherit; box-sizing: border-box;
}
.dialog-input:focus { border-color: var(--accent); }
.confirm-text { font-size: 14px; color: var(--text-primary); margin: 0; line-height: 1.6; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger {
  padding: 6px 14px; background: #ef4444; color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-danger:hover { background: #dc2626; }
</style>
