<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧边栏 -->
      <aside v-if="sidebarVisible" class="w-64 bg-sidebar border-r border-black flex flex-col shrink-0">
        <div class="p-3 border-b border-black">
          <el-button type="primary" size="small" icon="el-icon-plus" class="w-full" @click="createSession">
            新建会话
          </el-button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="session in sessions"
            :key="session.id"
            @click="selectSession(session)"
            class="px-3 py-2 cursor-pointer flex items-center gap-2 text-sm transition-colors"
            :class="currentSession?.id === session.id ? 'bg-active text-white' : 'text-textMuted hover:bg-white/5 hover:text-white'"
          >
            <i class="fa-regular fa-comment text-xs"></i>
            <span class="truncate">{{ session.title }}</span>
          </div>
        </div>
      </aside>

      <!-- 消息列表 -->
      <div class="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
        <div class="flex-1 overflow-y-auto p-4" ref="messageList">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex mb-4"
            :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg" :class="msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'">
              {{ msg.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="mx-3 max-w-[70%]" :class="msg.role === 'user' ? 'text-right' : ''">
              <div class="text-xs text-textMuted mb-1">{{ getRoleLabel(msg.role) }}</div>
              <div class="inline-block p-3 rounded-lg text-sm" :class="msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-sidebar text-textMain'">
                <div v-html="formatContent(msg.content)"></div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-textMuted">
            <div class="text-6xl mb-4 opacity-20">💬</div>
            <div>开始对话吧！输入您的问题...</div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="p-4 border-t border-black shrink-0">
          <div class="flex gap-3">
            <el-input
              v-model="input"
              type="textarea"
              :rows="2"
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              @keydown.enter.native="handleKeydown"
              :disabled="disabled"
              class="flex-1"
            />
            <el-button
              type="primary"
              :loading="disabled"
              @click="send"
              class="send-btn"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'Chat',

  props: {
    sidebarVisible: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      sessions: [],
      currentSession: null,
      messages: [],
      input: '',
      disabled: false,
    }
  },

  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      },
      deep: true
    },
    '$route.params.id': {
      immediate: true,
      handler(id) {
        if (id) {
          const session = this.sessions.find(s => s.id === id)
          if (session) {
            this.currentSession = session
            this.loadMessages(session.id)
          }
        }
      }
    }
  },

  created() {
    this.loadSessions()
  },

  methods: {
    async loadSessions() {
      try {
        const res = await api.getSessions()
        this.sessions = res.data || []
        if (this.sessions.length > 0 && !this.currentSession) {
          const sessionId = this.$route.params.id
          this.currentSession = sessionId 
            ? this.sessions.find(s => s.id === sessionId) || this.sessions[0]
            : this.sessions[0]
          this.loadMessages(this.currentSession.id)
        }
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    },

    async createSession() {
      try {
        const res = await api.createSession('新会话')
        this.sessions.unshift(res.data)
        this.selectSession(res.data)
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message)
      }
    },

    selectSession(session) {
      this.currentSession = session
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'chat-session', params: { id: session.id } }).catch(() => {})
      }
      this.loadMessages(session.id)
    },

    async loadMessages(sessionId) {
      try {
        const res = await api.getMessages(sessionId)
        this.messages = res.data || []
      } catch (e) {
        console.error('加载消息失败:', e)
        this.messages = []
      }
    },

    getRoleLabel(role) {
      const labels = {
        user: '你',
        assistant: 'AI',
        system: '系统',
        tool: '工具',
      }
      return labels[role] || role
    },

    formatContent(content) {
      if (!content) return ''
      let text = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
      text = text.replace(/\n/g, '<br>')
      return text
    },

    handleKeydown(e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.send()
    },

    async send() {
      const content = this.input.trim()
      if (!content || this.disabled) return

      if (!this.currentSession) {
        await this.createSession()
      }

      this.input = ''
      this.disabled = true

      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      }
      this.messages.push(userMsg)

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }
      this.messages.push(aiMsg)

      try {
        const res = await api.chat({
          sessionId: this.currentSession.id,
          message: content.trim(),
        })
        const lastMsg = this.messages[this.messages.length - 1]
        lastMsg.content = res.data?.response || res.data?.answer || '抱歉，没有获取到回复'
      } catch (e) {
        const lastMsg = this.messages[this.messages.length - 1]
        lastMsg.content = '错误: ' + e.message
      } finally {
        this.disabled = false
      }
    },

    scrollToBottom() {
      const list = this.$refs.messageList
      if (list) {
        list.scrollTop = list.scrollHeight
      }
    },
  },
}
</script>

<style scoped>
.send-btn {
  height: auto;
}
</style>
