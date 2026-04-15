<template>
  <div class="index-view">
    <div class="welcome-section">
      <div class="welcome-icon">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <h1 class="welcome-title">你好，我是 TXCode</h1>
      <p class="welcome-subtitle">AI 驱动的软件开发助手</p>
    </div>

    <div class="feature-grid">
      <div class="feature-card code" @click="goTo('/app/code')">
        <i class="fa-regular fa-comments"></i>
        <h3>代码对话</h3>
        <p>与 AI 对话开发</p>
      </div>

      <div class="feature-card workflow" @click="goTo('/app/dev')">
        <i class="fa-solid fa-laptop-code"></i>
        <h3>软件研发</h3>
        <p>规范研发流程</p>
      </div>

      <div class="feature-card files" @click="goTo('/app/files')">
        <i class="fa-solid fa-folder-open"></i>
        <h3>文件管理</h3>
        <p>浏览项目文件</p>
      </div>

      <div class="feature-card git" @click="goTo('/app/git')">
        <i class="fa-brands fa-git-alt"></i>
        <h3>Git变更</h3>
        <p>查看代码变更</p>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-title">最近会话</h2>
      <a href="javascript:void(0)" class="section-more" @click="goTo('/app/code')">查看全部</a>
    </div>

    <div v-if="sessions.length > 0" class="session-list">
      <div
        v-for="session in sessions.slice(0, 5)"
        :key="session.id"
        class="session-item"
        @click="goSession(session)"
      >
        <div class="session-icon">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="session-info">
          <h4>{{ session.title || '未命名会话' }}</h4>
          <p>{{ formatTime(session.updatedAt || session.createTime) }}</p>
        </div>
        <div class="session-status"></div>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="fa-regular fa-comment-dots"></i>
      <p>暂无会话记录</p>
      <span class="start-btn" @click="createSession">开始新对话</span>
    </div>
  </div>
</template>

<script>
import { api } from '../../api'

export default {
  name: 'IndexView',
  data() {
    return {
      sessions: []
    }
  },
  async created() {
    await this.loadSessions()
  },
  methods: {
    goTo(path) {
      window.location.href = path
    },
    async loadSessions() {
      try {
        const res = await api.getSessions()
        this.sessions = res.data || []
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    },
    goSession(session) {
      this.$router.push({ name: 'app-code-session', params: { id: session.id } })
    },
    async createSession() {
      try {
        const res = await api.createSession('新会话')
        this.$router.push({ name: 'app-code-session', params: { id: res.data.id } })
      } catch (e) {
        this.$message.error('创建会话失败')
      }
    },
    formatTime(time) {
      if (!time) return ''
      const date = new Date(time)
      const now = new Date()
      const diff = now - date
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
      if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
      return date.toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.index-view {
  padding: 24px 16px;
}

.welcome-section {
  text-align: center;
  padding: 40px 0;
}

.welcome-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 36px;
  color: white;
}

.welcome-section h1 {
  font-size: 24px;
  font-weight: 600;
  color: #f4f4f5;
  margin: 0 0 8px;
}

.welcome-section p {
  font-size: 14px;
  color: #84848a;
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 32px;
}

.feature-card {
  background: #121212;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #f4f4f5;
}

.feature-card:active {
  transform: scale(0.98);
  background: #18191b;
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.feature-icon i {
  font-size: 28px;
  color: white;
}

.feature-card.code .feature-icon { background: #3b82f6; }
.feature-card.workflow .feature-icon { background: #22c55e; }
.feature-card.files .feature-icon { background: #f59e0b; }
.feature-card.git .feature-icon { background: #f05032; }

.feature-info h3 {
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
  margin: 0 0 4px;
}

.feature-info p {
  font-size: 12px;
  color: #84848a;
  margin: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32px 0 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #f4f4f5;
}

.section-more {
  color: #3b82f6;
  font-size: 13px;
  text-decoration: none;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-item {
  background: #121212;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.session-item:active {
  background: #18191b;
}

.session-icon {
  width: 40px;
  height: 40px;
  background: #18191b;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 18px;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-info h4 {
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-info p {
  font-size: 12px;
  color: #84848a;
  margin: 0;
}

.session-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.session-status.processing {
  background: #3b82f6;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #84848a;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

.start-btn {
  display: inline-block;
  margin-top: 16px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}
</style>
