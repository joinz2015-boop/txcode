<template>
  <div class="app-container">
    <header class="header">
      <a href="#" class="header-back" @click.prevent="goBack">
        <i class="fa-solid fa-chevron-left"></i>
      </a>
      <div class="session-switch-btn" @click="showSessionDrawer = true">
        <i class="fa-solid fa-comments"></i>
        <span class="title">{{ currentSession?.title || '新会话' }}</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="header-actions">
        <a href="#" class="header-btn" title="命令" @click.prevent="showCommandDrawer = true">
          <i class="fa-solid fa-terminal"></i>
        </a>
      </div>
    </header>

    <div class="model-selector">
      <span>模型</span>
      <span class="model-name" @click="showModelDrawer = true">{{ modelName || 'gpt-4o' }}</span>
      <span class="model-change" @click="showModelDrawer = true" style="color: var(--accent); font-size: 12px;">切换</span>
    </div>

    <div class="chat-area" ref="chatArea">
      <div v-if="logItems.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="fa-regular fa-comments"></i>
        </div>
        <div class="empty-title">开始对话</div>
        <div class="empty-desc">选择或创建会话开始对话</div>
      </div>

      <template v-for="(item, idx) in logItems" :key="item._id || idx">
        <template v-if="item.type === 'chat'">
          <div class="message user">
            <div class="message-bubble">{{ item.content }}</div>
          </div>
        </template>

        <template v-else-if="item.type === 'think'">
          <div class="message assistant">
            <div class="message-bubble" v-html="renderMarkdown(item.content)"></div>
          </div>
        </template>

        <template v-else-if="item.type === 'todos'">
          <div class="message assistant">
            <div class="todo-list">
              <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
                <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                <span>{{ todo.name }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="item.type === 'step'">
          <div v-if="item.thought" class="message assistant">
            <div class="message-bubble" v-html="renderMarkdown(item.thought)"></div>
          </div>
          <div
            v-for="(tc, aIdx) in item.toolCalls"
            :key="'tc-' + aIdx"
            class="tool-log"
            :class="item.success !== false ? 'tool-success' : 'tool-fail'"
          >
            <span>{{ item.success !== false ? '✓' : '✗' }}</span>
            <span class="tool-name">{{ getToolCallName(tc) }}</span>
            <span class="tool-args">{{ formatToolArgs(tc) }}</span>
          </div>
        </template>

        <template v-else-if="item.type === 'system'">
          <div class="message assistant">
            <div class="message-bubble">{{ item.content }}</div>
          </div>
        </template>
      </template>

      <div v-if="isProcessing" class="message assistant thinking">
        <div class="message-bubble">思考中...</div>
      </div>
    </div>

    <div class="input-area">
      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            class="input-field"
            ref="inputField"
            v-model="inputMessage"
            placeholder="输入消息... (Enter 发送)"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
        </div>
        <button
          class="send-btn"
          :class="{ 'stop-btn': isProcessing }"
          @click="isProcessing ? stopGeneration() : sendMessage()"
          :disabled="!inputMessage.trim() && !isProcessing"
        >
          <i :class="isProcessing ? 'fa-solid fa-stop' : 'fa-solid fa-paper-plane'"></i>
        </button>
      </div>
      <div class="command-quick">
        <div class="command-chip" @click="appendCommand('/compact')">
          <i class="fa-solid fa-compress-alt"></i> 压缩会话
        </div>
        <div class="command-chip" @click="showFileDrawer = true">
          <i class="fa-solid fa-file-circle-plus"></i> 选择文件
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-indicator">
        <span class="status-dot" :class="{ processing: isProcessing }"></span>
        <span :class="{ 'status-processing': isProcessing, 'status-ready': !isProcessing }">{{ isProcessing ? '处理中...' : '就绪' }}</span>
      </div>
      <span>Token: {{ promptTokens || 0 }}</span>
    </div>

    <div class="drawer-overlay" :class="{ show: showSessionDrawer || showModelDrawer || showCommandDrawer }" @click="closeAllDrawers"></div>

    <FileSelectDrawer
      :visible="showFileDrawer"
      @select="onFileSelected"
      @close="showFileDrawer = false"
    />

    <div class="session-drawer" :class="{ show: showSessionDrawer }">
      <div class="drawer-header">
        <span class="drawer-title" style="color: var(--text-primary, #f4f4f5);">选择会话</span>
        <button class="drawer-close" @click="showSessionDrawer = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="drawer-search">
        <input type="text" v-model="searchKeyword" class="search-input" placeholder="搜索会话..." />
      </div>
      <div class="session-list">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="session-list-item"
          :class="{ active: session.id === currentSessionId }"
          @click="selectSession(session)"
        >
          <div class="session-list-icon">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="session-list-info">
            <div class="session-list-title">{{ session.title || '未命名会话' }}</div>
            <div class="session-list-meta">{{ formatTime(session.updatedAt || session.createTime) }}</div>
          </div>
          <div class="session-list-status" :class="{ processing: session.status === 'processing' }"></div>
        </div>
      </div>
      <div class="drawer-footer">
        <button class="new-session-btn" @click="createSession">
          <i class="fa-solid fa-plus"></i> 新建会话
        </button>
      </div>
    </div>

    <div class="session-drawer" :class="{ show: showModelDrawer }">
      <div class="drawer-header">
        <span class="drawer-title" style="color: var(--text-primary, #f4f4f5);">选择模型</span>
        <button class="drawer-close" @click="showModelDrawer = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="command-list">
        <div
          v-for="model in models"
          :key="model.id"
          class="command-item"
          :class="{ active: model.name === modelName }"
          @click="selectModel(model)"
        >
          <div class="command-icon">
            <i class="fa-solid fa-microchip"></i>
          </div>
          <div class="command-info">
            <div class="command-name">{{ model.name }}</div>
            <div class="command-desc">{{ model.provider || '默认' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="command-drawer" :class="{ show: showCommandDrawer }">
      <div class="drawer-header">
        <span class="drawer-title" style="color: var(--text-primary, #f4f4f5);">快捷命令</span>
        <button class="drawer-close" @click="showCommandDrawer = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="command-list">
        <div class="command-item" @click="appendCommand('/compact'); showCommandDrawer = false">
          <div class="command-icon">
            <i class="fa-solid fa-compress-alt"></i>
          </div>
          <div class="command-info">
            <div class="command-name">压缩会话</div>
            <div class="command-desc">减少上下文长度</div>
          </div>
        </div>
        <div class="command-item" @click="appendCommand('/clear'); showCommandDrawer = false">
          <div class="command-icon">
            <i class="fa-solid fa-trash"></i>
          </div>
          <div class="command-info">
            <div class="command-name">清空对话</div>
            <div class="command-desc">清空当前会话内容</div>
          </div>
        </div>
        <div class="command-item" @click="openFileSelect(); showCommandDrawer = false">
          <div class="command-icon">
            <i class="fa-solid fa-file-circle-plus"></i>
          </div>
          <div class="command-info">
            <div class="command-name">选择文件</div>
            <div class="command-desc">添加参考文件到上下文</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import { ws } from '../../api/websocket/websocket_client.js'
import * as sessions from '../../api/sessions.js'
import { api } from '../../api'
import FileSelectDrawer from './components/chat/FileSelectDrawer.vue'

export default {
  name: 'ChatView',
  components: {
    FileSelectDrawer
  },
  data() {
    return {
      sessions: [],
      currentSessionId: null,
      currentSession: null,
      logItems: [],
      inputMessage: '',
      isProcessing: false,
      modelName: '',
      promptTokens: 0,
      showSessionDrawer: false,
      showModelDrawer: false,
      showCommandDrawer: false,
      showFileDrawer: false,
      searchKeyword: '',
      models: [],
      logSeq: 0,
      wsUnsubscribe: null
    }
  },
  computed: {
    filteredSessions() {
      if (!this.searchKeyword) return this.sessions
      const kw = this.searchKeyword.toLowerCase()
      return this.sessions.filter(s => (s.title || '').toLowerCase().includes(kw))
    }
  },
  async created() {
    this.initGlobalWs()
    await this.loadSessions()
    await this.loadModels()
    await this.loadDefaultModel()

    const sessionId = this.$route.params.id
    if (sessionId) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (session) {
        await this.selectSession(session, false)
      }
    }
  },
  activated() {
    if (this.currentSessionId) {
      this.subscribeSession()
    }
  },
  deactivated() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
      this.wsUnsubscribe = null
    }
  },
  methods: {
    goBack() {
      this.$router.push('/app')
    },

    initGlobalWs() {
      ws.init()
    },

    closeAllDrawers() {
      this.showSessionDrawer = false
      this.showModelDrawer = false
      this.showCommandDrawer = false
      this.showFileDrawer = false
    },

    renderMarkdown(text) {
      if (!text) return ''
      return marked(text)
    },

    getTodoStatusIcon(status) {
      const icons = { completed: '✅', in_progress: '🔄', pending: '⬜', cancelled: '❌' }
      return icons[status] || '⬜'
    },

    getToolCallName(toolCall) {
      return toolCall?.function?.name || 'unknown'
    },

    formatToolArgs(toolCall) {
      try {
        const args = JSON.parse(toolCall?.function?.arguments || '{}')
        if (args.file_path) return args.file_path
        if (args.command) return args.command
        return toolCall?.function?.arguments || ''
      } catch {
        return toolCall?.function?.arguments || ''
      }
    },

    async loadSessions() {
      try {
        const res = await sessions.getSessions()
        this.sessions = res.data || []
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    },

    async loadModels() {
      try {
        const res = await api.getModels()
        this.models = res.data || []
      } catch (e) {
        console.error('加载模型失败:', e)
      }
    },

    async loadDefaultModel() {
      try {
        const res = await api.getConfig('defaultModel')
        if (res.data?.value) {
          this.modelName = res.data.value
        }
      } catch (e) {
        this.modelName = 'gpt-4o'
      }
    },

    async selectSession(session, navigate = true) {
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
        this.wsUnsubscribe = null
      }

      this.currentSession = session
      this.currentSessionId = session.id
      this.logItems = []
      this.isProcessing = session.status === 'processing'

      if (navigate && this.$route.params.id !== session.id) {
        this.$router.push({ name: 'app-code-session', params: { id: session.id } }).catch(() => {})
      }

      await this.loadMessages()
      this.subscribeSession()
      this.showSessionDrawer = false
    },

    async loadMessages() {
      try {
        const res = await sessions.getMessages(this.currentSessionId)
        this.logItems = (res.data || []).map(item => {
          if (item.type === 'think') return { type: 'think', content: item.content || '', _id: `log-${++this.logSeq}` }
          if (item.type === 'step') return { type: 'step', thought: item.thought, toolCalls: item.toolCalls || [], success: item.success, _id: `log-${++this.logSeq}` }
          if (item.type === 'chat') return { type: 'chat', content: item.content, _id: `log-${++this.logSeq}` }
          if (item.type === 'todos') return { type: 'todos', todos: item.todos || [], _id: `log-${++this.logSeq}` }
          return { type: 'system', content: String(item), _id: `log-${++this.logSeq}` }
        })
        this.scrollToBottom()
      } catch (e) {
        console.error('加载消息失败:', e)
      }
    },

    subscribeSession() {
      if (!this.currentSessionId) return

      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
      }

      this.wsUnsubscribe = ws.subscribe(this.currentSessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          this.updateSessionStatus(runningIds)
        },
        todos: (data) => {
          this.logItems.push({ type: 'todos', todos: data.todos, _id: `log-${++this.logSeq}` })
          this.scrollToBottom()
        },
        session: (data) => {
          if (data?.sessionId && !this.currentSessionId) {
            this.currentSessionId = data.sessionId
          }
        },
        step: (data) => {
          this.logItems.push({ type: 'step', thought: data?.thought, toolCalls: data?.toolCalls || [], success: data?.success, _id: `log-${++this.logSeq}` })
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollToBottom()
        },
        compact: (data) => {
          this.logItems.push({ type: 'system', content: `【压缩完成】${data.summary || ''}`, _id: `log-${++this.logSeq}` })
          this.loadSessions()
          this.loadMessages()
        },
        done: (data) => {
          this.isProcessing = false
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) {
            this.logItems.push({ type: 'think', content: data.response, _id: `log-${++this.logSeq}` })
          }
          this.loadSessions()
          this.scrollToBottom()
        },
        stopped: () => {
          this.isProcessing = false
          this.logItems.push({ type: 'think', content: '【已停止】', _id: `log-${++this.logSeq}` })
          this.scrollToBottom()
        },
        error: (data) => {
          this.isProcessing = false
          this.$message.error(data?.error || '发生错误')
        }
      })
    },

    updateSessionStatus(runningSessionIds) {
      const runningSet = new Set(runningSessionIds || [])
      const isRunning = runningSet.has(this.currentSessionId)
      if (isRunning) {
        this.isProcessing = true
      } else {
        this.isProcessing = false
      }
    },

    async createSession() {
      try {
        const res = await sessions.createSession('新会话')
        this.sessions.unshift(res.data)
        await this.selectSession(res.data)
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message)
      }
    },

    sendMessage() {
      if (!this.inputMessage.trim() || this.isProcessing) return

      if (!this.currentSessionId) {
        this.createSession().then(() => this.sendMessage())
        return
      }

      const content = this.inputMessage.trim()
      this.inputMessage = ''
      this.isProcessing = true

      this.logItems.push({ type: 'chat', content, _id: `log-${++this.logSeq}` })
      this.scrollToBottom()

      ws.send('chat', { message: content, sessionId: this.currentSessionId, modelName: this.modelName || undefined })
    },

    stopGeneration() {
      if (!this.currentSessionId) return
      this.isProcessing = false
      ws.send('stop', { sessionId: this.currentSessionId })
    },

    appendCommand(cmd) {
      this.inputMessage = cmd + ' '
      this.$refs.inputField?.focus()
    },

    openFileSelect() {
      this.showFileDrawer = true
    },

    onFileSelected(filePath) {
      this.inputMessage = this.inputMessage + filePath + ' '
      this.showFileDrawer = false
      this.$refs.inputField?.focus()
    },

    selectModel(model) {
      const parts = model.name.split('/')
      this.modelName = parts.length > 2 ? parts.slice(1).join('/') : model.name
      api.setConfig('defaultModel', this.modelName)
      this.showModelDrawer = false
    },

    formatTime(time) {
      if (!time) return ''
      const date = new Date(time)
      const now = new Date()
      const diff = now - date
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
      if (diff < 86400000) return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
      return date.toLocaleDateString()
    },

    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatArea) {
          this.$refs.chatArea.scrollTop = this.$refs.chatArea.scrollHeight
        }
      })
    }
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-primary, #0a0a09);
}

.header {
  background: var(--bg-secondary, #121212);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color, #27272a);
  flex-shrink: 0;
}

.header-back {
  color: var(--text-muted, #84848a);
  font-size: 18px;
  text-decoration: none;
  padding: 8px;
  margin: -8px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  color: var(--text-muted, #84848a);
  font-size: 16px;
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}

.header-btn:hover {
  color: var(--text-primary, #f4f4f5);
}

.session-switch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary, #18191b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 20px;
  color: var(--text-secondary, #d4d4d8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  max-width: 180px;
}

.session-switch-btn:active {
  background: var(--bg-primary, #0a0a09);
}

.session-switch-btn .title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-switch-btn .arrow {
  font-size: 10px;
  color: var(--text-muted, #84848a);
}

.model-selector {
  background: var(--bg-secondary, #121212);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #27272a);
  font-size: 13px;
  color: var(--text-muted, #84848a);
  flex-shrink: 0;
}

.model-selector span:first-child {
  color: var(--text-secondary, #d4d4d8);
}

.model-name {
  flex: 1;
  color: var(--accent, #3b82f6);
  cursor: pointer;
}

.model-change {
  color: var(--accent, #3b82f6);
  font-size: 12px;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-bubble {
  padding: 14px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-bubble {
  background: var(--accent, #3b82f6);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-bubble {
  background: var(--bg-secondary, #121212);
  border: 1px solid var(--border-color, #27272a);
  border-bottom-left-radius: 4px;
  color: var(--text-secondary, #d4d4d8);
}

.message.assistant.thinking .message-bubble {
  background: linear-gradient(135deg, var(--bg-secondary, #121212), var(--bg-tertiary, #18191b));
}

.todo-list {
  background: var(--bg-secondary, #121212);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary, #d4d4d8);
}

.todo-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color, #27272a);
}

.todo-status {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.tool-log {
  font-size: 13px;
  color: var(--text-muted, #84848a);
  padding: 10px 12px;
  background: var(--bg-tertiary, #18191b);
  border-radius: 8px;
  margin-top: 8px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-success {
  color: var(--success, #22c55e);
}

.tool-fail {
  color: var(--danger, #ef4444);
}

.tool-name {
  color: var(--accent, #3b82f6);
}

.tool-args {
  color: var(--text-muted, #84848a);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: var(--bg-secondary, #121212);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon i {
  font-size: 32px;
  color: var(--text-muted, #84848a);
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted, #84848a);
}

.input-area {
  background: var(--bg-secondary, #121212);
  border-top: 1px solid var(--border-color, #27272a);
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  flex-shrink: 0;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.input-field {
  width: 100%;
  min-height: 48px;
  max-height: 120px;
  padding: 12px 16px;
  background: var(--bg-tertiary, #18191b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 24px;
  color: var(--text-primary, #f4f4f5);
  font-size: 15px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: var(--accent, #3b82f6);
}

.input-field::placeholder {
  color: var(--text-muted, #84848a);
}

.send-btn {
  width: 48px;
  height: 48px;
  background: var(--accent, #3b82f6);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:disabled {
  background: var(--bg-tertiary, #18191b);
  color: var(--text-muted, #84848a);
  cursor: not-allowed;
}

.send-btn:not(:disabled):active {
  transform: scale(0.95);
}

.stop-btn {
  background: var(--danger, #ef4444);
}

.command-quick {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  overflow-x: auto;
  padding: 0 4px;
}

.command-quick::-webkit-scrollbar {
  display: none;
}

.command-chip {
  padding: 8px 14px;
  background: var(--bg-tertiary, #18191b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary, #d4d4d8);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.command-chip i {
  font-size: 14px;
  color: var(--accent, #3b82f6);
}

.command-chip:active {
  background: var(--accent, #3b82f6);
  border-color: var(--accent, #3b82f6);
  color: white;
}

.command-chip:active i {
  color: white;
}

.status-bar {
  background: var(--bg-secondary, #121212);
  border-top: 1px solid var(--border-color, #27272a);
  padding: 6px 16px;
  font-size: 11px;
  color: var(--text-muted, #84848a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success, #22c55e);
}

.status-dot.processing {
  background: var(--danger, #ef4444);
  animation: pulse 1.5s infinite;
}

.status-processing {
  color: var(--danger, #ef4444);
}

.status-ready {
  color: var(--success, #22c55e);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  z-index: 999;
}

.drawer-overlay.show {
  opacity: 1;
  visibility: visible;
}

.session-drawer,
.command-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-secondary, #121212);
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.command-drawer {
  max-height: 60vh;
}

.session-drawer.show,
.command-drawer.show {
  transform: translateY(0);
}

.drawer-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #27272a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
}

.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary, #18191b);
  border: none;
  color: var(--text-muted, #84848a);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #27272a);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary, #18191b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 20px;
  color: var(--text-primary, #f4f4f5);
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted, #84848a);
}

.session-list,
.command-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.session-list-item,
.command-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  transition: background 0.2s;
  cursor: pointer;
}

.session-list-item:active,
.command-item:active {
  background: var(--bg-tertiary, #18191b);
}

.session-list-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--accent, #3b82f6);
  padding-left: 13px;
}

.command-item.active {
  background: rgba(59, 130, 246, 0.1);
}

.session-list-icon,
.command-icon {
  width: 44px;
  height: 44px;
  background: var(--bg-tertiary, #18191b);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent, #3b82f6);
  flex-shrink: 0;
}

.session-list-item.active .session-list-icon {
  background: var(--accent, #3b82f6);
  color: white;
}

.session-list-info,
.command-info {
  flex: 1;
  min-width: 0;
}

.session-list-title,
.command-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #f4f4f5);
}

.session-list-meta,
.command-desc {
  font-size: 12px;
  color: var(--text-muted, #84848a);
}

.session-list-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success, #22c55e);
  flex-shrink: 0;
}

.session-list-status.processing {
  background: var(--accent, #3b82f6);
  animation: pulse 1.5s infinite;
}

.drawer-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #27272a);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  flex-shrink: 0;
}

.new-session-btn {
  width: 100%;
  padding: 14px;
  background: var(--accent, #3b82f6);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.message-bubble :deep(p) {
  margin: 0 0 12px 0;
}

.message-bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble :deep(code) {
  background: var(--bg-tertiary, #18191b);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
