<template>
  <aside class="session-sidebar">
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
        v-for="session in sessions"
        :key="session.folderName"
        class="session-item"
        :class="{ active: currentFolderName === session.folderName }"
        @click="$emit('select', session)"
      >
        <div class="session-title">{{ session.folderName }}</div>
        <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
        <span class="session-menu" @click.stop="toggleMenu(session, $event)">⋮</span>
      </div>
    </div>

    <div class="sidebar-menu-popup" v-if="menuTarget" :style="menuStyle">
      <div class="menu-item" @click="startRename">重命名</div>
      <div class="menu-item danger" @click="confirmDelete">删除</div>
    </div>

    <el-dialog :visible.sync="renameVisible" title="重命名会话" width="400px" :close-on-click-modal="false">
      <el-input v-model="renameValue" placeholder="请输入新名称" @keydown.enter.native="doRename"></el-input>
      <span slot="footer">
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" @click="doRename" :disabled="!renameValue.trim()">确定</el-button>
      </span>
    </el-dialog>

    <el-dialog :visible.sync="deleteVisible" title="确认删除" width="360px" :close-on-click-modal="false">
      <p>确定要删除会话「{{ deleteTarget ? deleteTarget.folderName : '' }}」吗？此操作不可恢复。</p>
      <span slot="footer">
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" @click="doDelete">删除</el-button>
      </span>
    </el-dialog>
  </aside>
</template>

<script>
export default {
  name: 'PlanSessionSidebar',
  props: {
    sessions: { type: Array, default: () => [] },
    currentFolderName: { type: String, default: '' },
  },
  data() {
    return {
      menuTarget: null,
      menuStyle: {},
      renameVisible: false,
      renameValue: '',
      renameTarget: null,
      deleteVisible: false,
      deleteTarget: null,
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
      this.menuStyle = { position: 'fixed', top: rect.bottom + 4 + 'px', left: rect.left - 100 + 'px' }
    },
    startRename() {
      this.renameTarget = this.menuTarget
      this.renameValue = this.menuTarget.folderName
      this.menuTarget = null
      this.renameVisible = true
    },
    doRename() {
      if (!this.renameValue.trim() || !this.renameTarget) return
      this.$emit('rename', this.renameTarget, this.renameValue.trim())
      this.renameVisible = false
      this.renameTarget = null
    },
    confirmDelete() {
      this.deleteTarget = this.menuTarget
      this.menuTarget = null
      this.deleteVisible = true
    },
    doDelete() {
      if (!this.deleteTarget) return
      this.$emit('delete', this.deleteTarget)
      this.deleteVisible = false
      this.deleteTarget = null
    },
    formatTime(isoStr) {
      if (!isoStr) return ''
      const d = new Date(isoStr)
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hour = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${min}`
    },
  },
}
</script>

<style scoped>
.session-sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--color-panel);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-title {
  font-size: 12px;
  color: var(--color-textMuted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sidebar-new-btn {
  font-size: 12px;
  padding: 5px 12px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}
.sidebar-new-btn:hover { background: #818cf8; }

.sidebar-content { flex: 1; overflow-y: auto; }

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 16px;
  color: var(--color-textMuted);
  font-size: 13px;
}

.session-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-textMuted);
  border-left: 2px solid transparent;
  transition: all 0.15s;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.session-item:hover { background: var(--color-hoverBg, #1e1e30); color: var(--color-textMain); }
.session-item.active {
  background: var(--color-hoverBg, #1e1e30);
  border-left-color: var(--color-accent);
  color: var(--color-textMain);
}
.session-item.active .session-time { color: var(--color-accent); }

.session-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-time { font-size: 11px; color: var(--color-textMuted); }

.session-menu {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-textMuted);
  opacity: 0;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.session-item:hover .session-menu { opacity: 1; }
.session-menu:hover { background: var(--color-border); color: var(--color-textMain); }

.sidebar-menu-popup {
  position: fixed;
  z-index: 200;
  min-width: 100px;
  background: var(--color-panelHeader);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  padding: 4px;
}
.sidebar-menu-popup .menu-item {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-textMain);
}
.sidebar-menu-popup .menu-item:hover { background: rgba(255,255,255,0.06); }
.sidebar-menu-popup .menu-item.danger { color: var(--color-danger, #ef4444); }
</style>
