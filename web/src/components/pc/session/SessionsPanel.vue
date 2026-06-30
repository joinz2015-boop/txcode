<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">会话列表</div>
      <el-button type="primary" size="small" @click="$emit('create')" class="new-btn">
        + 新建
      </el-button>
    </div>
    <div class="sidebar-content">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: currentSessionId === session.id }"
        draggable="true"
        @dragstart="$emit('dragstart', $event, session)"
        @click="$emit('select', session)"
      >
        <div class="session-row">
          <span class="session-title truncate">{{ session.title || '新会话' }}</span>
          <span class="session-time">{{ formatTime(session.createdAt) }}</span>
          <div class="session-actions" @click.stop>
            <el-dropdown trigger="click" @command="(cmd) => $emit('command', cmd, session)">
              <span class="action-btn">⋮</span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="rename">重命名</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>
      <div v-if="hasMore" class="load-more" @click="$emit('loadmore')">
        <el-button size="small" :loading="loadingMore">加载更多</el-button>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'SessionsSidebar',
  props: {
    sessions: { type: Array, default: () => [] },
    currentSessionId: { type: String, default: null },
    hasMore: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false }
  },
  methods: {
    formatTime(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${min}`
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: var(--color-panel);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title { font-size: 12px; color: var(--color-textMuted); font-weight: bold; }
.new-btn { font-size: 12px; padding: 4px 8px; }
.sidebar-content { flex: 1; overflow-y: auto; }

.session-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--color-textMuted);
  transition: all 0.2s;
  border-left: 2px solid transparent;
  position: relative;
}

.session-item:hover { background-color: var(--color-inputBg); color: var(--color-textMain); }
.session-item:hover .session-actions { opacity: 1; }
.session-item.active { background-color: var(--color-inputBg); border-left-color: var(--color-accent); color: #f4f4f5; }
.session-item.active .session-time { color: var(--color-accent); }

.session-row { display: flex; flex-direction: column; gap: 2px; }
.session-title { order: 1; }
.session-time { order: 2; font-size: 11px; color: var(--color-textMuted); }

.session-actions {
  order: 3;
  opacity: 0;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  transition: opacity 0.2s;
}

.action-btn {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-textMuted);
}

.action-btn:hover { background-color: var(--color-border); color: var(--color-textMain); }

.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.load-more { padding: 12px; text-align: center; border-top: 1px solid var(--color-border); }
</style>
