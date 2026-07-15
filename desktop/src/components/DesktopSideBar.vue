<template>
  <div class="sidebar">
    <template v-if="currentView === 'coding'">
      <div class="sidebar-section">
        <a class="section-header" href="#" @click.prevent="$emit('navigate', 'coding')">
          <div class="section-header-left">
            <div class="section-icon coding">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <span class="section-label" style="color:var(--accent);">编码</span>
          </div>
          <button class="section-add-btn" @click.stop="createSession" title="新建计划会话">+</button>
        </a>
        <div class="section-body">
          <div
            v-for="session in sessions"
            :key="session.folderName"
            class="sub-item"
            :class="{ active: currentSession && currentSession.folderName === session.folderName }"
            @click="selectSession(session)"
            @contextmenu.prevent="openContextMenu($event, session)"
          >
            <span class="sub-item-icon">📋</span>
            <span class="sub-item-name">{{ session.meta.sessionName || session.folderName }}</span>
            <span class="sub-item-extra">{{ formatTime(session.meta.updatedAt || session.meta.createdAt) }}</span>
          </div>
          <div v-if="sessions.length === 0" class="sub-item-empty">
            暂无计划会话
          </div>
        </div>
      </div>
      <div class="sidebar-section">
        <a class="section-header" href="#" @click.prevent="$emit('navigate', 'design')">
          <div class="section-header-left">
            <div class="section-icon design">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <span class="section-label">设计</span>
          </div>
        </a>
        <div class="section-body">
          <div class="sub-item" @click="$emit('navigate', 'specs')">
            <span class="sub-item-icon">📋</span><span class="sub-item-name">规范</span>
          </div>
          <div class="sub-item" @click="$emit('navigate', 'skills')">
            <span class="sub-item-icon">⚡</span><span class="sub-item-name">Skill</span>
          </div>
        </div>
      </div>
      <div class="sidebar-section">
        <a class="section-header" href="#" @click.prevent="$emit('navigate', 'settings')">
          <div class="section-header-left">
            <div class="section-icon settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </div>
            <span class="section-label">设置</span>
          </div>
        </a>
      </div>
    </template>

    <template v-else>
      <div class="sidebar-section">
        <a class="section-header" href="#" @click.prevent="$emit('navigate', 'coding')">
          <div class="section-header-left">
            <div class="section-icon coding">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <span class="section-label">编码</span>
          </div>
        </a>
      </div>
      <div class="sidebar-section">
        <a class="section-header" href="#" @click.prevent="$emit('navigate', 'design')">
          <div class="section-header-left">
            <div class="section-icon design">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <span class="section-label">设计</span>
          </div>
        </a>
      </div>
      <div class="sidebar-section">
        <div class="section-header">
          <div class="section-header-left">
            <div class="section-icon settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </div>
            <span class="section-label" style="color:var(--text-secondary);">设置</span>
          </div>
        </div>
        <div class="section-body">
          <div class="sub-item" :class="{ active: currentView === 'settings' }" @click="$emit('navigate', 'settings')">
            <span class="sub-item-icon">🔌</span><span class="sub-item-name">供应商</span>
          </div>
          <div class="sub-item" :class="{ active: currentView === 'specs' }" @click="$emit('navigate', 'specs')">
            <span class="sub-item-icon">📋</span><span class="sub-item-name">规范</span>
          </div>
          <div class="sub-item" :class="{ active: currentView === 'skills' }" @click="$emit('navigate', 'skills')">
            <span class="sub-item-icon">⚡</span><span class="sub-item-name">Skill</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <div class="context-menu-item" @click="renameContextSession">重命名</div>
      <div class="context-menu-item danger" @click="deleteContextSession">删除</div>
    </div>
  </div>
</template>

<script>
import { listPlanSessions, createPlanSession, renamePlanSession, deletePlanSession } from '@/api/index'
import { setItem } from '@/utils/storage'

export default {
  name: 'DesktopSideBar',
  props: {
    currentView: { type: String, default: 'coding' },
    currentSession: { type: Object, default: null }
  },
  data() {
    return {
      sessions: [],
      contextMenu: { visible: false, x: 0, y: 0, session: null }
    }
  },
  mounted() {
    this.loadSessions()
    document.addEventListener('click', this.closeContextMenu)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeContextMenu)
  },
  methods: {
    async loadSessions() {
      try {
        const r = await listPlanSessions()
        this.sessions = r.data || []
      } catch (e) {
        console.error('加载计划会话失败:', e)
      }
    },
    async createSession() {
      try {
        await createPlanSession('新计划会话')
        await this.loadSessions()
        const s = this.sessions[0]
        if (s) this.selectSession(s)
      } catch (e) {
        console.error('创建失败:', e)
      }
    },
    selectSession(session) {
      setItem('planSession:current', session)
      this.$emit('selectSession', session)
    },
    openContextMenu(e, session) {
      this.contextMenu = { visible: true, x: e.clientX, y: e.clientY, session }
    },
    closeContextMenu() {
      this.contextMenu.visible = false
    },
    async renameContextSession() {
      const session = this.contextMenu.session
      const newName = prompt('输入新名称:', session.meta.sessionName || session.folderName)
      if (newName && newName.trim()) {
        try {
          await renamePlanSession(session.folderName, newName.trim())
          await this.loadSessions()
          if (this.currentSession && this.currentSession.folderName === session.folderName) {
            const updated = this.sessions.find(s => s.folderName === session.folderName)
            if (updated) this.selectSession(updated)
          }
        } catch (e) {
          console.error('重命名失败:', e)
        }
      }
      this.closeContextMenu()
    },
    async deleteContextSession() {
      const session = this.contextMenu.session
      if (!confirm(`确定删除 "${session.meta.sessionName || session.folderName}" 吗？`)) {
        this.closeContextMenu()
        return
      }
      try {
        await deletePlanSession(session.folderName)
        if (this.currentSession && this.currentSession.folderName === session.folderName) {
          this.$emit('selectSession', null)
        }
        await this.loadSessions()
      } catch (e) {
        console.error('删除失败:', e)
      }
      this.closeContextMenu()
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
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 250px;
  min-width: 250px;
  background: var(--bg-side);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
  text-decoration: none;
}
.section-header:hover { background: var(--bg-hover); }
.section-header-left { display: flex; align-items: center; gap: 8px; }
.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.section-icon.coding { background: #eef1ff; color: #4f6ef7; }
.section-icon.design { background: #f0f0ff; color: #8b5cf6; }
.section-icon.settings { background: #f0f0f5; color: #555770; }
.section-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.section-add-btn {
  width: 22px; height: 22px; border: none;
  background: var(--accent); color: #fff; border-radius: 4px;
  cursor: pointer; font-size: 14px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.15s;
}
.section-add-btn:hover { opacity: 0.85; }
.sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 44px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-secondary);
  transition: all 0.1s;
}
.sub-item:hover { color: var(--text-primary); }
.sub-item.active { color: var(--accent); font-weight: 600; }
.sub-item-icon { font-size: 13px; width: 18px; text-align: center; flex-shrink: 0; }
.sub-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-item-extra { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.sub-item-empty {
  padding: 12px 14px 12px 44px;
  font-size: 12px; color: var(--text-muted);
}

.context-menu {
  position: fixed; z-index: 1000;
  background: #fff; border: 1px solid var(--border);
  border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  min-width: 120px; padding: 4px;
}
.context-menu-item {
  padding: 7px 14px; font-size: 12.5px;
  cursor: pointer; border-radius: 4px;
  color: var(--text-primary); transition: background 0.1s;
}
.context-menu-item:hover { background: var(--bg-hover); }
.context-menu-item.danger { color: #ef4444; }
.context-menu-item.danger:hover { background: #fef2f2; }
</style>
