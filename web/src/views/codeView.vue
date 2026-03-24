<template>
  <div class="code-view">
    <aside v-if="sidebarVisible" class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">会话列表</div>
        <el-button type="primary" size="small" @click="createSession" class="new-btn">
          + 新建
        </el-button>
      </div>
      <div class="sidebar-content">
        <div
          v-for="session in displayedSessions"
          :key="session.id"
          @click="selectSession(session)"
          class="session-item"
          :class="currentSession?.id === session.id ? 'active' : ''"
        >
          <span class="session-time">{{ formatTime(session.createdAt) }}</span>
          <span class="session-title truncate">{{ session.title || '新会话' }}</span>
        </div>
        <div v-if="hasMore" class="load-more" @click="loadMore">
          <el-button size="small" :loading="loadingMore">加载更多</el-button>
        </div>
      </div>
    </aside>

    <div class="terminal-container">
      <div class="header-block">
        <span class="title"># {{ userQuestion }}</span>
        <span class="stats"></span>
      </div>

      <div class="log-area" ref="logArea">
        <template v-for="(item, index) in logItems" :key="index">
          <p v-if="item.type === 'chat' || item.type === 'think'" class="user-question" v-html="renderMarkdown(item.content)"></p>
          <template v-else-if="item.type === 'step'">
            <p v-if="item.thought" v-html="renderMarkdown(item.thought)"></p>
            <div v-if="item.action" class="log-mute">
              <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                {{ item.success !== false ? '✓' : '✗' }}
              </span>
              {{ item.action }}
              <span v-if="item.input" class="tool-input">{{ formatInput(item.action, item.input) }}</span>
            </div>
          </template>
        </template>

        <div v-if="logItems.length === 0" class="empty-state">
          <span>开始对话吧！输入您的问题...</span>
        </div>

        <div class="build-info" v-if="modelName">
          <span class="icon">▣</span> Build · {{ modelName }}
        </div>
      </div>

      <div class="input-block">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          placeholder="输入消息... (Enter 发送)"
          @keydown.enter.native="handleKeydown"
          :disabled="disabled"
          class="input-area"
        />
        <el-button type="primary" :loading="disabled" @click="send" class="send-btn">
          发送
        </el-button>
      </div>

      <div class="footer">
        <div class="footer-left">
          <span :class="wsConnected ? 'ws-connected' : 'ws-disconnected'">●</span>
          {{ wsConnected ? 'WebSocket' : 'HTTP' }} | 模型: {{ modelName || 'deepseek' }} | Token: {{ tokenCount }} | 会话: {{ sessionIdShort }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'
import { marked } from 'marked'

export default {
  name: 'CodeView',

  props: {
    sidebarVisible: { type: Boolean, default: true }
  },

  data() {
    return {
      sessions: [],
      displayedSessions: [],
      currentSession: null,
      logItems: [],
      userQuestion: 'New Session',
      page: 1,
      pageSize: 10,
      hasMore: false,
      loadingMore: false,
      modelName: '',
      tokenCount: 0,
      input: '',
      disabled: false,
      wsConnected: false,
    }
  },

  computed: {
    sessionIdShort() {
      return this.currentSession?.id?.slice(0, 8) || '--------'
    }
  },

  watch: {
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
    this.initWebSocket()
  },

  beforeDestroy() {
    api.wsDisconnect()
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
    },

    formatInput(action, input) {
      try {
        const parsed = JSON.parse(input)
        if (action === 'bash' || action === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ` (${parsed.workdir})` : '')
        }
        if (action === 'read_file') {
          return parsed.file_path + (parsed.offset ? `:${parsed.offset}` : '')
        }
        if (action === 'edit_file') {
          return parsed.file_path
        }
        if (action === 'write_file') {
          return parsed.file_path
        }
        if (action === 'glob' || action === 'find_files') {
          return parsed.pattern + (parsed.directory ? ` (${parsed.directory})` : '')
        }
        if (action === 'grep' || action === 'search_content') {
          return `"${parsed.pattern}" (${parsed.directory || ''})`
        }
        return input
      } catch {
        return input
      }
    },

    renderMarkdown(text) {
      if (!text) return ''
      return marked(text)
    },

    initWebSocket() {
      api.wsConnect(
        (msg) => {
          this.handleWsMessage(msg)
        },
        () => {
          this.wsConnected = true
          console.log('WebSocket 已连接')
        },
        () => {
          this.wsConnected = false
          console.log('WebSocket 已断开')
          setTimeout(() => {
            if (!api.wsIsConnected()) {
              this.initWebSocket()
            }
          }, 3000)
        },
        (err) => {
          this.wsConnected = false
          console.error('WebSocket 错误:', err)
        }
      )
    },

    handleWsMessage(msg) {
      const { type, data, error } = msg

      switch (type) {
        case 'session':
          if (data?.sessionId && !this.currentSession) {
            this.currentSession = { id: data.sessionId }
          }
          break
        case 'step':
          if (data) {
            this.logItems.push({ 
              type: 'step', 
              thought: data.thought, 
              action: data.action,
              input: data.input,
              success: data.success
            })
            this.tokenCount += 50
            this.$nextTick(() => this.scrollToBottom())
          }
          break
        case 'done':
          this.handleDone(data)
          break
        case 'error':
          this.$message.error(error || '发生错误')
          this.disabled = false
          break
      }
    },

    handleDone(data) {
      this.disabled = false
      if (data?.response) {
        this.logItems.push({ type: 'think', content: data.response })
      }
      if (data?.sessionId) {
        this.loadSessions()
      }
      this.$nextTick(() => this.scrollToBottom())
    },

    async loadSessions() {
      try {
        const res = await api.getSessions()
        this.sessions = res.data || []
        this.page = 1
        this.displayedSessions = this.sessions.slice(0, this.pageSize)
        this.hasMore = this.sessions.length > this.pageSize
        if (this.displayedSessions.length > 0 && !this.currentSession) {
          const sessionId = this.$route.params.id
          this.currentSession = sessionId 
            ? this.displayedSessions.find(s => s.id === sessionId) || this.displayedSessions[0]
            : this.displayedSessions[0]
          this.loadMessages(this.currentSession.id)
        }
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    },

    loadMore() {
      this.loadingMore = true
      this.page++
      const nextSessions = this.sessions.slice(0, this.page * this.pageSize)
      this.displayedSessions = nextSessions
      this.hasMore = this.sessions.length > nextSessions.length
      this.loadingMore = false
    },

    async createSession() {
      try {
        const res = await api.createSession('新会话')
        this.sessions.unshift(res.data)
        this.page = 1
        this.displayedSessions = this.sessions.slice(0, this.pageSize)
        this.hasMore = this.sessions.length > this.pageSize
        this.selectSession(res.data)
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message)
      }
    },

    selectSession(session) {
      this.currentSession = session
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'codeView-session', params: { id: session.id } }).catch(() => {})
      }
      this.loadMessages(session.id)
    },

    async loadMessages(sessionId) {
      try {
        const res = await api.getMessages(sessionId)
        this.logItems = res.data || []
        if (this.logItems.length > 0) {
          const userItem = this.logItems.find(item => item.type === 'chat' || item.type === 'think')
          if (userItem) {
            this.userQuestion = userItem.content
          }
        }
      } catch (e) {
        console.error('加载消息失败:', e)
        this.logItems = []
      }
    },

    handleKeydown(e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.send()
    },

    async send() {
      const content = this.input.trim()
      if (!content || this.disabled) return

      this.input = ''
      this.disabled = true
      this.userQuestion = content
      this.logItems.push({ type: 'chat', content: content })

      if (api.wsIsConnected()) {
        api.wsChat(
          {
            message: content,
            sessionId: this.currentSession?.id,
          },
          {
            onSession: (data) => {
              if (!this.currentSession) {
                this.currentSession = { id: data.sessionId }
              }
            },
            onDone: (data) => this.handleDone(data),
            onError: (err) => {
              this.$message.error(err.error || '发送失败')
              this.disabled = false
            }
          }
        )
      } else {
        try {
          const res = await api.chat({
            sessionId: this.currentSession?.id,
            message: content,
          })
          
          if (res.data?.reactSteps) {
            res.data.reactSteps.forEach(step => {
              if (step.thought) {
                this.logItems.push({ type: 'think', content: step.thought })
              }
              if (step.action) {
                this.logItems.push({ type: 'tool', name: step.action, input: step.actionInput, success: true })
              }
            })
          }
          
          if (res.data?.response) {
            this.logItems.push({ type: 'think', content: res.data.response })
          }
          
          if (res.data?.sessionId) {
            this.currentSession = { id: res.data.sessionId }
            this.loadSessions()
          }
        } catch (e) {
          this.$message.error('发送失败: ' + e.message)
        } finally {
          this.disabled = false
        }
      }
    },

    scrollToBottom() {
      const log = this.$refs.logArea
      if (log) {
        log.scrollTop = log.scrollHeight
      }
    },
  },
}
</script>

<style scoped>
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #52525b; }

.code-view {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #0a0a09;
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace;
}

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  background-color: #0a0a09;
  border: 1px solid #1e1e1e;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  overflow: hidden;
}

.header-block {
  display: flex;
  justify-content: space-between;
  background-color: #121212;
  padding: 16px 20px;
  border-left: 2px solid #27272a;
  font-weight: bold;
}

.header-block .title { color: #f4f4f5; }
.header-block .stats { color: #84848a; font-weight: normal; }

.log-area {
  flex: 1;
  padding: 0 20px 24px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.log-area p {
  margin: 0 0 16px 0;
  color: #d4d4d8;
}

.user-question {
  color: #60a5fa;
  font-weight: bold;
}

.log-mute {
  color: #84848a;
  margin-bottom: 16px;
  white-space: pre;
}

.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #84848a;
}

.build-info {
  color: #84848a;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.build-info .icon { color: #60a5fa; font-size: 12px; }

.input-block {
  background-color: #18191b;
  padding: 16px 20px;
  border-left: 2px solid #3b82f6;
  margin-bottom: 12px;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-area {
  flex: 1;
}

.send-btn {
  height: auto;
}

.ws-connected { color: #22c55e; }
.ws-disconnected { color: #ef4444; }

.footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  font-size: 13px;
}

.footer-left { display: flex; gap: 16px; align-items: center; color: #84848a; }

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

.sidebar-title {
  font-size: 12px;
  color: #84848a;
  font-weight: bold;
}

.new-btn {
  font-size: 12px;
  padding: 4px 8px;
}

.sidebar-content { flex: 1; overflow-y: auto; }

.session-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #84848a;
  transition: all 0.2s;
  border-left: 2px solid transparent;
}

.session-item:hover {
  background-color: #18191b;
  color: #d4d4d8;
}

.session-item.active {
  background-color: #18191b;
  border-left-color: #3b82f6;
  color: #f4f4f5;
}

.session-time {
  font-size: 11px;
  color: #545459;
}

.session-item.active .session-time { color: #60a5fa; }

.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.load-more { padding: 12px; text-align: center; border-top: 1px solid #27272a; }
</style>
