<template>
  <div id="app">
    <!-- 主容器布局 -->
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header height="60px" class="header">
        <Header
          :session="currentSession"
          @new-session="createSession"
          @open-settings="openSettings"
        />
      </el-header>

      <!-- 主内容区域 -->
      <el-container>
        <!-- 左侧会话列表 -->
        <el-aside width="250px" v-if="showSidebar" class="sidebar">
          <SessionsSidebar
            :sessions="sessions"
            :current-session-id="currentSession?.id"
            @select="selectSession"
            @delete="deleteSession"
          />
        </el-aside>

        <!-- 右侧内容区 -->
        <el-main class="main-content">
          <router-view
            :session="currentSession"
            :messages="messages"
            @send-message="sendMessage"
          />
        </el-main>
      </el-container>
    </el-container>


  </div>
</template>

<script>
import Header from './components/Header.vue';
import SessionsSidebar from './components/SessionsSidebar.vue';

export default {
  name: 'App',

  components: {
    Header,
    SessionsSidebar,
  },

  data() {
    return {
      sessions: [],          // 会话列表
      currentSession: null,  // 当前活动会话
      messages: [],          // 当前会话的消息列表
      loading: false,        // 加载状态
    };
  },

  computed: {
    // 是否显示侧边栏（设置页面不显示）
    showSidebar() {
      return this.$route.name !== 'settings';
    },
  },

  async created() {
    // 应用初始化时加载会话列表
    await this.loadSessions();
  },

  methods: {
    /**
     * 加载会话列表
     */
    async loadSessions() {
      try {
        const res = await this.$api.getSessions();
        this.sessions = res.data || [];
        // 如果有会话，默认选择第一个
        if (this.sessions.length > 0 && !this.currentSession) {
          this.selectSession(this.sessions[0]);
        }
      } catch (e) {
        this.$message.error('加载会话失败: ' + e.message);
      }
    },

    /**
     * 创建新会话
     */
    async createSession() {
      try {
        const res = await this.$api.createSession('新会话');
        this.sessions.unshift(res.data);
        this.selectSession(res.data);
        this.$message.success('会话创建成功');
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message);
      }
    },

    /**
     * 选择会话
     */
    async selectSession(session) {
      this.currentSession = session;
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'chat-session', params: { id: session.id } }).catch(() => {});
      }
      // 加载该会话的消息
      await this.loadMessages(session.id);
    },

    /**
     * 删除会话
     */
    async deleteSession(id) {
      try {
        await this.$api.deleteSession(id);
        this.sessions = this.sessions.filter(s => s.id !== id);
        // 如果删除的是当前会话，切换到其他会话
        if (this.currentSession?.id === id) {
          this.currentSession = this.sessions[0] || null;
          if (this.currentSession) {
            this.selectSession(this.currentSession);
          } else {
            this.messages = [];
          }
        }
        this.$message.success('会话已删除');
      } catch (e) {
        this.$message.error('删除会话失败: ' + e.message);
      }
    },

    /**
     * 加载会话消息
     */
    async loadMessages(sessionId) {
      try {
        const res = await this.$api.getMessages(sessionId);
        this.messages = res.data || [];
      } catch (e) {
        console.error('加载消息失败:', e);
        this.messages = [];
      }
    },

    /**
     * 发送消息
     */
    async sendMessage(content) {
      if (!content.trim() || this.loading) return;

      this.loading = true;

      // 添加用户消息到界面
      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      this.messages.push(userMsg);

      // AI 回复占位
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      this.messages.push(aiMsg);

      try {
        // 调用 AI 接口
        const res = await this.$api.chat({
          sessionId: this.currentSession.id,
          message: content.trim(),
        });

        // 更新 AI 回复
        const lastMsg = this.messages[this.messages.length - 1];
        lastMsg.content = res.data?.response || res.data?.answer || '抱歉，没有获取到回复';
      } catch (e) {
        const lastMsg = this.messages[this.messages.length - 1];
        lastMsg.content = '错误: ' + e.message;
        this.$message.error('发送消息失败: ' + e.message);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 打开设置页面
     */
    openSettings() {
      this.$router.push({ name: 'settings' });
    },
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  background: #409EFF;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.sidebar {
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.main-content {
  padding: 0;
  background: #fff;
}
</style>
