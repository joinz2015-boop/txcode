<template>
  <div class="test-chat-panel" :style="{ width: width + 'px', flexShrink: 0 }">
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="logItems.length === 0" class="empty-hint">
        <p>输入测试要求，AI 将通过 Playwright 自动操控浏览器</p>
        <p class="hint-sub">例如："请登录系统，账号 admin，密码 123456"</p>
      </div>
      <template v-for="(item, idx) in logItems">
        <div v-if="item.type === 'todos'" :key="idx" class="todos-list">
          <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
            <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
            <span class="todo-name">{{ todo.name }}</span>
          </div>
        </div>
        <div v-else-if="item.type === 'chat'" :key="idx" class="user-msg">
          <div class="user-bubble">{{ item.content }}</div>
        </div>
        <div v-else-if="item.type === 'think'" :key="idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
        <div v-else-if="item.type === 'step'" :key="idx" class="step-block">
          <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
          <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
            <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
            {{ getToolCallName(tc) }}
            <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
          </div>
          <div v-if="item.screenshot" class="step-screenshot">
            <img :src="'data:image/png;base64,' + item.screenshot" class="screenshot-img" @click="openImagePreview(item.screenshot)" />
          </div>
        </div>
        <div v-else-if="item.type === 'system'" :key="idx" class="system-msg">{{ item.content }}</div>
      </template>
      <div v-if="disabled && !stopping" class="typing-indicator">
        <span class="typing-dot">●</span>
        <span class="typing-dot">●</span>
        <span class="typing-dot">●</span>
      </div>
    </div>
    <div class="input-area">
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          placeholder="输入测试要求... (Enter 发送, Shift+Enter 换行)"
          rows="3"
          :disabled="disabled"
          @keydown="handleKeydown"
        ></textarea>
        <div class="input-actions">
          <span :class="disabled ? 'status-thinking' : 'status-ready'">
            <span v-if="disabled && !stopping" class="thinking-spinner"></span>
            {{ disabled ? (stopping ? '■ 停止中' : '思考中') : '✓ 就绪' }}
          </span>
          <span class="sep">|</span>
          <span>会话: {{ sessionIdDisplay }}</span>
          <span class="sep">|</span>
          <span>token: {{ promptTokens }}</span>
          <div class="actions-spacer"></div>
          <button class="action-btn btn-test" @click="fillTestCommand" :disabled="disabled">方案测试</button>
          <button v-if="disabled && !stopping" class="action-btn btn-stop" @click="stopChat">■ 停止</button>
          <button v-else-if="stopping" class="action-btn btn-stop" disabled>停止中...</button>
          <button v-else class="action-btn btn-send" :disabled="!canSend" @click="sendMessage">发送</button>
        </div>
      </div>
    </div>
    <div v-if="previewImage" class="image-lightbox" @click="previewImage = null">
      <span class="lightbox-close" @click="previewImage = null">&times;</span>
      <img :src="'data:image/png;base64,' + previewImage" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import { setItem } from '@/utils/storage'

let logSeq = 0

export default {
  name: 'DesktopTestChatPanel',
  props: {
    sessionId: { type: String, default: '' },
    planFilePath: { type: String, default: '' },
    planFolderName: { type: String, default: '' },
    webContentsId: { type: Number, default: null },
    modelName: { type: String, default: '' },
    backendPort: { type: String, default: '41000' },
    projectPath: { type: String, default: '' },
    width: { type: Number, default: 420 },
  },
  emits: ['session-created'],
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      currentSessionId: this.sessionId || '',
      logItems: [],
      previewImage: null,
      ws: null,
      _wsUnsubs: [],
    }
  },
  computed: {
    canSend() {
      return this.inputMessage.trim().length > 0 && !this.disabled
    },
    sessionIdDisplay() {
      return this.currentSessionId ? this.currentSessionId.slice(-8) : '新建'
    },
  },
  methods: {
    getBaseURL() {
      return `http://localhost:${this.backendPort}`
    },
    connectWS() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return
      const url = `ws://localhost:${this.backendPort}/ws/code`
      this.ws = new WebSocket(url)
      this.ws.onopen = () => {
        console.log('[TestChatPanel] WS connected')
      }
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this.handleWSMessage(msg)
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }
      this.ws.onclose = () => {
        console.log('[TestChatPanel] WS disconnected')
        this.ws = null
      }
    },
    handleWSMessage(msg) {
      switch (msg.type) {
        case 'step': {
          const step = msg.data || msg
          const si = step.sessionId
          const myId = this.currentSessionId
          if (si && myId && !si.includes(myId) && !myId.includes(si)) return
          this.logItems.push({ type: 'step', ...step, _seq: ++logSeq })
          this.promptTokens = step.usage?.totalTokens || this.promptTokens
          break
        }
        case 'done': {
          const done = msg.data || msg
          const si = done.sessionId
          const myId = this.currentSessionId
          if (si && myId && !si.includes(myId) && !myId.includes(si)) return
          this.logItems.push({ type: 'system', content: done.response || '完成', _seq: ++logSeq })
          this.promptTokens = done.usage?.totalTokens || this.promptTokens
          this.disabled = false
          this.stopping = false
          break
        }
        case 'stopped': {
          const ss = msg.sessionId || (msg.data && msg.data.sessionId)
          const myId = this.currentSessionId
          if (ss && myId && !ss.includes(myId) && !myId.includes(ss)) return
          this.logItems.push({ type: 'system', content: '已停止', _seq: ++logSeq })
          this.disabled = false
          this.stopping = false
          break
        }
        case 'error': {
          const es = msg.sessionId || (msg.data && msg.data.sessionId)
          const myId = this.currentSessionId
          if (es && myId && !es.includes(myId) && !myId.includes(es)) return
          this.logItems.push({ type: 'system', content: '错误: ' + (msg.error || '未知'), _seq: ++logSeq })
          this.disabled = false
          this.stopping = false
          break
        }
        default:
          break
      }
      this.$nextTick(() => this.scrollToBottom())
    },
    scrollToBottom() {
      const c = this.$refs.messagesContainer
      if (c) {
        c.scrollTop = c.scrollHeight
      }
    },
    async sendMessage() {
      const text = this.inputMessage.trim()
      if (!text || this.disabled) return
      this.connectWS()

      if (!this.currentSessionId) {
        this.currentSessionId = 'test_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
        this.$emit('session-created', this.currentSessionId)
      }

      this.logItems.push({ type: 'chat', content: text, _seq: ++logSeq })
      this.disabled = true
      this.inputMessage = ''
      this.$nextTick(() => this.scrollToBottom())

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const payload = {
          type: 'chat',
          data: {
            message: text,
            sessionId: this.currentSessionId,
            agent: 'test',
            planFilePath: this.planFilePath,
            webContentsId: this.webContentsId,
            projectPath: this.projectPath,
          },
        }
        this.ws.send(JSON.stringify(payload))
      } else {
        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const payload = {
              type: 'chat',
              data: {
                message: text,
                sessionId: this.currentSessionId,
                agent: 'test',
                planFilePath: this.planFilePath,
                webContentsId: this.webContentsId,
                projectPath: this.projectPath,
              },
            }
            this.ws.send(JSON.stringify(payload))
          } else {
            this.logItems.push({ type: 'system', content: 'WebSocket 未连接', _seq: ++logSeq })
            this.disabled = false
          }
        }, 500)
      }
    },
    stopChat() {
      this.stopping = true
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'stop', data: { sessionId: this.currentSessionId } }))
      }
    },
    fillTestCommand() {
      if (this.disabled) return
      let cmd = '请执行以下测试方案：\n\n'
      if (this.planFilePath) {
        cmd += `根据方案文件 ${this.planFilePath} 设计并执行完整的测试流程。`
      } else {
        cmd += '请设计并执行完整的测试流程。'
      }
      this.inputMessage = cmd
      this.$nextTick(() => {
        const ta = this.$el.querySelector('textarea')
        if (ta) ta.focus()
      })
    },
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },
    getToolCallName(tc) {
      if (typeof tc === 'object' && tc !== null) {
        return tc.function?.name || tc.name || 'unknown'
      }
      return 'unknown'
    },
    getToolCallArguments(tc) {
      if (typeof tc === 'object' && tc !== null) {
        let args = tc.function?.arguments
        if (!args) return null
        if (typeof args === 'string') {
          try { return JSON.parse(args) } catch { return args }
        }
        return args
      }
      return null
    },
    formatInput(toolName, args) {
      if (!args) return ''
      if (toolName === 'bash' && args.command) return args.command.length > 60 ? args.command.slice(0, 60) + '...' : args.command
      if (toolName === 'write_file' && args.file_path) return args.file_path.split('/').pop() || args.file_path
      if (toolName === 'read_file' && args.file_path) return args.file_path.split('/').pop() || args.file_path
      if (toolName === 'edit_file' && args.file_path) return args.file_path.split('/').pop() || args.file_path
      if (toolName === 'grep' && args.pattern) return args.pattern.length > 40 ? args.pattern.slice(0, 40) + '...' : args.pattern
      return ''
    },
    getTodoStatusIcon(status) {
      const icons = { pending: '○', in_progress: '◉', completed: '●', cancelled: '✕' }
      return icons[status] || '○'
    },
    renderMarkdown(text) {
      if (!text) return ''
      try {
        return marked(text, { breaks: true })
      } catch {
        return text
      }
    },
    openImagePreview(base64) {
      this.previewImage = base64
    },
  },
  mounted() {
    this.connectWS()
  },
  beforeDestroy() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  },
}
</script>

<style scoped>
.test-chat-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid var(--border, #e0e0e0);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.empty-hint {
  text-align: center;
  color: var(--text-muted, #999);
  padding-top: 60px;
}
.empty-hint p { margin: 4px 0; }
.hint-sub { font-size: 12px; opacity: 0.7; }

.user-msg { display: flex; justify-content: flex-end; margin: 8px 0; }
.user-bubble {
  background: var(--accent, #4f6ef7);
  color: #fff;
  padding: 8px 14px;
  border-radius: 14px 14px 4px 14px;
  max-width: 85%;
  word-break: break-word;
  font-size: 13px;
}

.ai-thought {
  color: var(--text-muted, #666);
  font-size: 12px;
  margin: 6px 0;
  padding: 6px 10px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #e0e0e0;
}

.log-mute {
  font-size: 11.5px;
  color: var(--text-muted, #888);
  margin: 2px 0;
  padding: 2px 8px;
}

.tool-success { color: #22c55e; font-weight: bold; margin-right: 4px; }
.tool-fail { color: #ef4444; font-weight: bold; margin-right: 4px; }
.tool-input { color: var(--text-primary, #333); font-family: monospace; font-size: 11px; margin-left: 4px; }

.step-block { margin: 6px 0; }
.step-screenshot { margin: 8px 0; }
.screenshot-img {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border, #e0e0e0);
  cursor: pointer;
  transition: transform 0.15s;
}
.screenshot-img:hover { transform: scale(1.02); }

.system-msg {
  text-align: center;
  color: var(--text-muted, #999);
  font-size: 11.5px;
  margin: 8px 0;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  font-size: 8px;
  color: var(--accent, #4f6ef7);
}

.input-area {
  border-top: 1px solid var(--border, #e0e0e0);
  padding: 8px 10px;
  background: var(--bg-titlebar, #fafafa);
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

textarea {
  width: 100%;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
  box-sizing: border-box;
}
textarea:focus { border-color: var(--accent, #4f6ef7); }

.input-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #888);
}

.sep { color: var(--border, #d0d0d0); }

.status-ready { color: #22c55e; }
.status-thinking { color: var(--accent, #4f6ef7); }

.thinking-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--accent, #4f6ef7);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
}

@keyframes spin { to { transform: rotate(360deg); } }

.actions-spacer { flex: 1; }

.action-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  font-family: inherit;
  transition: opacity 0.15s;
}
.action-btn:disabled { opacity: 0.5; cursor: default; }
.action-btn:hover:not(:disabled) { opacity: 0.85; }

.btn-test { background: #e8f0fe; color: var(--accent, #4f6ef7); }
.btn-stop { background: #fef2f2; color: #ef4444; }
.btn-send { background: var(--accent, #4f6ef7); color: #fff; }

.todos-list { margin: 6px 0; }
.todo-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; }
.todo-status { font-size: 10px; min-width: 16px; text-align: center; }
.todo-name { color: var(--text-primary, #333); }

.image-lightbox {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
  z-index: 10000;
}
.lightbox-close {
  position: absolute; top: 20px; right: 30px; font-size: 30px; color: #fff; cursor: pointer;
}
.lightbox-image {
  max-width: 90%; max-height: 90%; border-radius: 8px;
}
</style>
