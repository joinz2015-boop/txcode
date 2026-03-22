<template>
  <div class="sessions-sidebar">
    <!-- 标题 -->
    <div class="sidebar-header">
      <span>会话列表</span>
    </div>

    <!-- 会话列表 -->
    <div class="session-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === currentSessionId }"
        @click="$emit('select', session)"
      >
        <div class="session-info">
          <div class="session-title">{{ session.title || '未命名会话' }}</div>
          <div class="session-time">{{ formatTime(session.updatedAt || session.createdAt) }}</div>
        </div>
        <el-button
          type="text"
          icon="el-icon-delete"
          class="delete-btn"
          @click.stop="$emit('delete', session.id)"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="sessions.length === 0" class="empty-state">
        暂无会话，点击右上角新建
      </div>
    </div>
  </div>
</template>

<script>
/**
 * SessionsSidebar 组件
 * 
 * 左侧会话列表侧边栏，显示所有会话
 * 支持选择会话和删除会话
 */
export default {
  name: 'SessionsSidebar',

  props: {
    // 会话列表
    sessions: {
      type: Array,
      default: () => [],
    },
    // 当前选中的会话 ID
    currentSessionId: {
      type: String,
      default: null,
    },
  },

  methods: {
    /**
     * 格式化时间显示
     */
    formatTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;

      // 一小时内显示"X分钟前"
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return mins <= 1 ? '刚刚' : `${mins}分钟前`;
      }

      // 今天显示时间
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }

      // 其他显示日期
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    },
  },
};
</script>

<style scoped>
.sessions-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 15px;
  font-weight: bold;
  border-bottom: 1px solid #e4e7ed;
}

.session-list {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.session-item:hover {
  background-color: #e6f7ff;
}

.session-item.active {
  background-color: #bae7ff;
}

.session-info {
  flex: 1;
  overflow: hidden;
}

.session-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  color: #f56c6c;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 40px 20px;
  font-size: 14px;
}
</style>
