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
        </a>
        <div class="section-body">
          <div
            v-for="(session, idx) in sessions"
            :key="idx"
            class="sub-item"
            :class="{ active: currentSession && currentSession.id === session.id }"
            @click="selectSession(session)"
          >
            <span class="sub-item-icon">{{ session.icon }}</span>
            <span class="sub-item-name">{{ session.name }}</span>
            <span class="sub-item-extra">{{ session.time }}</span>
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
  </div>
</template>

<script>
export default {
  name: 'DesktopSideBar',
  props: {
    currentView: { type: String, default: 'coding' },
    currentSession: { type: Object, default: null }
  },
  data() {
    return {
      sessions: [
        { id: '1', name: 'Express API 路由开发', icon: '💬', time: '10:32' },
        { id: '2', name: 'TypeScript 类型优化', icon: '🔧', time: '09:15' },
        { id: '3', name: '修复 WebSocket 断连', icon: '🐛', time: '昨天' },
        { id: '4', name: '数据库迁移脚本', icon: '🗄️', time: '昨天' }
      ]
    }
  },
  methods: {
    selectSession(session) {
      this.$emit('selectSession', session)
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
</style>
