<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">终端会话</div>
      <el-button type="primary" size="small" @click="$emit('create')" class="new-btn">
        +
      </el-button>
    </div>
    <div class="sidebar-content">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: currentSessionId === session.id }"
        @click="$emit('select', session)"
      >
        <div class="session-row">
          <span class="session-indicator">{{ currentSessionId === session.id ? '●' : '○' }}</span>
          <span class="session-title truncate">{{ session.title || '终端' }}</span>
          <span class="delete-btn" @click.stop="$emit('delete', session)">×</span>
        </div>
      </div>
      <div v-if="sessions.length === 0" class="empty-state">
        <span>暂无终端会话</span>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'TerminalSidebar',
  props: {
    sessions: { type: Array, default: () => [] },
    currentSessionId: { type: String, default: null }
  }
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: #0a0a09;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #27272a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title { font-size: 12px; color: #84848a; font-weight: bold; }
.new-btn {
  font-size: 14px;
  padding: 2px 8px;
  min-width: 24px;
  height: 24px;
  background: #3b82f6;
  border: none;
}
.new-btn:hover { background: #2563eb; }

.sidebar-content { flex: 1; overflow-y: auto; }

.session-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #84848a;
  transition: all 0.2s;
  border-left: 2px solid transparent;
  position: relative;
}

.session-item:hover { background-color: #18191b; color: #d4d4d8; }
.session-item:hover .delete-btn { opacity: 1; }
.session-item.active { background-color: #18191b; border-left-color: #3b82f6; color: #f4f4f5; }
.session-item.active .session-indicator { color: #3b82f6; }

.session-row { display: flex; align-items: center; gap: 8px; }
.session-indicator { font-size: 10px; color: #545459; }
.session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.delete-btn {
  opacity: 0;
  font-size: 16px;
  color: #84848a;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s;
}
.delete-btn:hover { background-color: #ef4444; color: white; }

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #545459;
  font-size: 12px;
}
</style>
