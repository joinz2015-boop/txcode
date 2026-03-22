<template>
  <div class="header">
    <!-- Logo 和标题 -->
    <div class="logo">
      <span class="logo-icon">⚡</span>
      <span class="logo-text">TXCode</span>
    </div>

    <!-- 当前会话标题 -->
    <div class="session-title" v-if="session">
      {{ session.title || '未命名会话' }}
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <el-button
        type="primary"
        size="small"
        icon="el-icon-plus"
        @click="$emit('new-session')"
      >
        新建会话
      </el-button>
      <el-button
        type="text"
        icon="el-icon-setting"
        @click="$emit('open-settings')"
        class="settings-btn"
      >
        设置
      </el-button>
    </div>
  </div>
</template>

<script>
/**
 * Header 组件
 * 
 * 顶部导航栏，包含：
 * - Logo 和应用名称
 * - 当前会话标题
 * - 新建会话按钮
 * - 设置按钮
 */
export default {
  name: 'Header',

  props: {
    // 当前会话
    session: {
      type: Object,
      default: null,
    },
  },
};
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  color: #fff;
}

.logo {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: bold;
}

.logo-icon {
  margin-right: 8px;
  font-size: 24px;
}

.session-title {
  font-size: 16px;
  opacity: 0.9;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-btn {
  color: #fff;
}
</style>
