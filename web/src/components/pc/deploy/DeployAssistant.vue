<template>
  <div class="chat-panel">
    <div class="panel-header">
      <span><i class="fa-solid fa-robot"></i> AI 部署助手</span>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="!messages.length" class="empty-state">
        <i class="fa-solid fa-rocket text-3xl text-textMuted opacity-30 mb-4"></i>
        <p>点击"按部署文档部署"开始自动化部署</p>
      </div>
      <template v-for="(msg, idx) in messages" :key="idx">
        <div v-if="msg.type === 'user'" class="user-message">
          {{ msg.content }}
        </div>
        <div v-else-if="msg.type === 'step'" class="ai-step">
          <div v-if="msg.thought" class="ai-thought" v-html="renderMarkdown(msg.thought)"></div>
          <div v-for="(tc, tIdx) in msg.toolCalls" :key="tIdx" class="log-mute">
            <span :class="msg.success !== false ? 'tool-success' : 'tool-fail'">
              {{ msg.success !== false ? '✓' : '✗' }}
            </span>
            {{ tc.function?.name || '' }}
            <span v-if="tc.function?.arguments" class="tool-input">
              {{ formatArgs(tc.function.name, tc.function.arguments) }}
            </span>
          </div>
        </div>
        <div v-else-if="msg.type === 'done'" class="ai-done" v-html="renderMarkdown(msg.content)"></div>
        <div v-else-if="msg.type === 'error'" class="ai-error">
          {{ msg.content }}
        </div>
      </template>
      <div class="build-info" v-if="modelName">
        <span>▣</span> Build · {{ modelName }}
      </div>
    </div>
    <div class="chat-input-area">
      <div class="input-row">
        <ResizableTextarea
          v-model="inputMessage"
          :rows="5"
          :min-rows="2"
          :max-rows="15"
          placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行)"
          :disabled="disabled && !stopping"
          class="input-area"
          @keydown.enter.native="handleKeydown"
        />
        <div class="input-actions">
          <el-button
            v-if="disabled && !stopping"
            type="danger"
            @click="stopChat"
            size="small"
          >
            ■ 停止
          </el-button>
          <el-button
            v-else-if="stopping"
            type="info"
            disabled
            size="small"
          >
            停止中...
          </el-button>
          <el-button
            v-else
            type="default"
            :disabled="!inputMessage.trim() || disabled"
            @click="sendMessage"
            size="small"
          >
            发送
          </el-button>
        </div>
      </div>
      <div class="deploy-doc-link" @click="deployByDoc">
        <i class="fa-solid fa-file-arrow-up"></i> 按部署文档部署
      </div>
    </div>
    <div class="status-bar">
      <span :class="sessionStatus === 'processing' ? 'status-thinking' : 'status-ready'">
        <span v-if="sessionStatus === 'processing'" class="thinking-spinner"></span>
        {{ sessionStatus === 'processing' ? '思考中' : '✓ 就绪' }}
      </span>
      <span class="separator">|</span>
      <span>模型：{{ modelName || '-' }}</span>
      <span class="separator">|</span>
      <span>会话：{{ displaySessionId }}</span>
      <span class="separator">|</span>
      <span>token：{{ promptTokens }}</span>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import { api } from '../../../api'
import ResizableTextarea from '../chat/ResizableTextarea.vue'

export default {
  name: 'DeployAssistant',
  components: { ResizableTextarea },
  props: {
    hasContent: { type: Boolean, default: false },
    docContent: { type: String, default: '' },
    projectPath: { type: String, default: '' },
    releasePath: { type: String, default: '' }
  },
  data() {
    return {
      ws: null,
      sessionId: '',
      inputMessage: '',
      messages: [],
      disabled: false,
      stopping: false,
      modelName: '',
      promptTokens: 0,
      sessionStatus: 'idle',
      heartbeatTimer: null
    }
  },
  computed: {
    displaySessionId() {
      return this.sessionId ? this.sessionId.slice(0, 8) : '--------'
    }
  },
  async mounted() {
    const savedSessionId = await this.loadSavedSession()
    if (savedSessionId) {
      this.sessionId = savedSessionId
    }
    this.connect()
  },
  beforeDestroy() {
    this.disconnect()
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
  },
  methods: {
    connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws/caller`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        if (!this.sessionId) {
          this.sessionId = 'deploy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
        }
        this.ws.send(JSON.stringify({
          type: 'init',
          data: {
            callbackUrl: 'http://localhost:40000',
            projectPath: this.projectPath || '',
            tools: [],
            sessionId: this.sessionId,
            title: '部署助手'
          }
        }))
        this.heartbeatTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this.handleMessage(msg)
        } catch (e) {
          console.error('Parse WS message error:', e)
        }
      }

      this.ws.onclose = () => {
        this.sessionStatus = 'idle'
        this.disabled = false
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
      }

      this.ws.onerror = (err) => {
        console.error('WS error:', err)
        this.sessionStatus = 'idle'
        this.disabled = false
      }
    },

    disconnect() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
    },

    handleMessage(msg) {
      switch (msg.type) {
        case 'connected':
          break
        case 'init_ready':
          this.sessionId = msg.data?.sessionId || this.sessionId
          this.saveSessionId(this.sessionId)
          this.loadHistoryMessages()
          break
        case 'step':
          this.messages.push({
            type: 'step',
            thought: msg.data?.thought,
            toolCalls: msg.data?.toolCalls || [],
            success: msg.data?.success
          })
          if (msg.data?.usage?.promptTokens) {
            this.promptTokens = msg.data.usage.promptTokens
          }
          this.scrollToBottom()
          break
        case 'done':
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'completed'
          this.messages.push({ type: 'done', content: msg.data?.response || '' })
          if (msg.data?.modelName) this.modelName = msg.data.modelName
          if (msg.data?.usage?.promptTokens) this.promptTokens = msg.data.usage.promptTokens
          this.scrollToBottom()
          break
        case 'error':
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.messages.push({ type: 'error', content: msg.error || '发生错误' })
          this.scrollToBottom()
          break
      }
    },

    sendMessage(e) {
      if (e) e.preventDefault()
      const content = this.inputMessage.trim()
      if (!content || this.disabled || !this.ws) return

      this.messages.push({ type: 'user', content })
      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.sessionStatus = 'processing'

      this.ws.send(JSON.stringify({
        type: 'chat',
        data: { sessionId: this.sessionId, message: content }
      }))
      this.scrollToBottom()
    },

    deployByDoc() {
      if (this.disabled) return
      this.inputMessage = `请按 ${this.releasePath} 文档进行部署`
    },

    stopChat() {
      if (!this.sessionId || this.stopping || !this.ws) return
      this.stopping = true
      this.ws.send(JSON.stringify({
        type: 'stop',
        data: { sessionId: this.sessionId }
      }))
    },

    handleKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          return
        } else {
          e.preventDefault()
          this.sendMessage()
        }
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },

    async loadSavedSession() {
      if (!this.projectPath) return null
      try {
        const deployJsonPath = `${this.projectPath}/.txcode/release/deploy.json`
        const res = await api.getFileContent(deployJsonPath)
        if (res?.data?.content) {
          const data = JSON.parse(res.data.content)
          return data.sessionId || null
        }
      } catch (e) {
        // 文件不存在，返回 null
      }
      return null
    },

    async saveSessionId(sessionId) {
      if (!this.projectPath) return
      try {
        const deployJsonPath = `${this.projectPath}/.txcode/release/deploy.json`
        await api.writeFile(deployJsonPath, JSON.stringify({ sessionId }, null, 2))
      } catch (e) {
        console.error('保存 sessionId 失败:', e)
      }
    },

    async loadHistoryMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        const messages = res?.data || []
        if (messages.length > 0) {
          this.messages = messages.map(msg => {
            if (msg.type === 'chat' && msg.role === 'user') {
              return { type: 'user', content: msg.content }
            }
            if (msg.role === 'assistant') {
              return { type: 'done', content: msg.content }
            }
            return msg
          })
        }
      } catch (e) {
        console.error('加载历史消息失败:', e)
      }
    },

    renderMarkdown(text) {
      return text ? marked(text) : ''
    },

    formatArgs(name, args) {
      try {
        const parsed = JSON.parse(args)
        if (name === 'bash' || name === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ` (${parsed.workdir})` : '')
        }
        if (name === 'read_file') {
          return parsed.file_path + (parsed.offset ? `:${parsed.offset}` : '')
        }
        if (name === 'edit_file' || name === 'write_file') {
          return parsed.file_path
        }
        if (name === 'glob') {
          return parsed.pattern
        }
        if (name === 'grep') {
          return `"${parsed.pattern}"`
        }
        return args
      } catch {
        return args
      }
    }
  }
}
</script>

<style scoped>
.chat-panel {
  width: 480px;
  background: #121212;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.panel-header {
  background: #121212;
  border-bottom: 1px solid #1e1e1e;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
  flex-shrink: 0;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  font-size: 14px;
  line-height: 1.6;
  min-height: 0;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #84848a;
}
.user-message {
  color: #60a5fa;
  font-weight: bold;
  border: 1px solid #60a5fa;
  padding: 15px;
  margin: 15px;
  border-radius: 10px;
  display: inline-block;
  max-width: 80%;
  text-align: left;
}
.ai-thought {
  color: #d4d4d8;
  margin-bottom: 16px;
}
.ai-done {
  color: #d4d4d8;
  margin-bottom: 16px;
}
.ai-error {
  color: #ef4444;
  margin-bottom: 16px;
}
.log-mute {
  color: #84848a;
  margin-bottom: 16px;
  white-space: pre;
}
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }
.build-info {
  color: #84848a;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.chat-input-area {
  padding: 12px 16px;
  background: #121212;
  border-top: 1px solid #1e1e1e;
}
.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.input-area {
  flex: 1;
  background: #18191b;
  border: 1px solid #27272a;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f4f4f5;
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
}
.input-area:focus {
  border-color: #60a5fa;
}
.input-area::placeholder {
  color: #52525b;
}
.deploy-doc-link {
  color: #60a5fa;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.deploy-doc-link:hover {
  color: #93c5fd;
  text-decoration: underline;
}
.input-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  flex-shrink: 0;
}
.status-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 16px;
  font-size: 12px;
  color: #84848a;
  border-top: 1px solid #1e1e1e;
  flex-shrink: 0;
  flex-wrap: wrap;
  background: #0a0a09;
}
.status-bar .separator {
  color: #3f3f46;
}
.status-ready { color: #22c55e; }
.status-thinking { color: #60a5fa; }
.thinking-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #60a5fa;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
