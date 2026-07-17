<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>测试验收</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="logItems.length === 0" class="empty-hint">输入测试要求进行验收</div>
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
            <div v-else-if="item.type === 'step'" :key="idx">
              <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
              <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
                <template v-if="tc.status === 'executing'">
                  <span class="tool-spinner"></span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </template>
                <template v-else>
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </template>
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
    </div>
  </div>
</template>

<script>
import { ws } from '@/utils/websocket'
import { createSession, getMessages } from '@/api/index'
import { saveMeta } from '@/api/index'
import { setItem } from '@/utils/storage'
import { marked } from 'marked'

let logSeq = 0

export default {
  name: 'DesktopPlanCodeTest',
  props: {
    currentModel: { type: String, default: '' },
    planSession: { type: Object, default: null },
    planFilePath: { type: String, default: '' }
  },
  emits: ['close'],
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      sessionId: '',
      logItems: [],
      wsUnsubscribe: null
    }
  },
  computed: {
    canSend() {
      return this.inputMessage.trim() && !this.disabled
    },
    sessionIdDisplay() {
      return this.sessionId ? this.sessionId.substring(0, 8) : '未创建'
    }
  },
  mounted() {
    this.loadSession()
  },
  methods: {
    async loadSession() {
      if (!this.planSession) return
      const meta = this.planSession.meta || {}
      if (meta.testSessionId) {
        this.sessionId = meta.testSessionId
        await this.loadMessages()
        this.subscribeSession()
      }
    },
    async ensureSession() {
      if (this.sessionId) return this.sessionId
      const r = await createSession(this.planSession ? this.planSession.folderName + '_test' : '测试')
      this.sessionId = r.data.id
      if (this.planSession) {
        const meta = { ...this.planSession.meta, testSessionId: this.sessionId, updatedAt: new Date().toISOString() }
        await saveMeta(this.planSession.folderName, meta)
        this.planSession.meta = meta
        setItem('planSession:current', this.planSession)
      }
      return this.sessionId
    },
    fillTestCommand() {
      if (this.planFilePath) {
        this.inputMessage = `根据 ${this.planFilePath} 方案检查相应功能是否完成。`
      }
    },
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!this.disabled && this.inputMessage.trim()) this.sendMessage()
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.disabled) return
      try { await this.ensureSession() } catch { return }
      this.subscribeSession()
      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.logItems.push(this.withLogId({ type: 'chat', content }))
      this.$nextTick(() => this.scrollToBottom())
      ws.send('chat', {
        message: content,
        sessionId: this.sessionId,
        modelName: this.currentModel || undefined,
        agent: 'code'
      })
    },
    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.sessionId })
    },
    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()
      this.wsUnsubscribe = ws.subscribe(this.sessionId, {
        todos: (d) => {
          if (d && d.todos) this.logItems.push(this.withLogId({ type: 'todos', todos: d.todos }))
          this.$nextTick(() => this.scrollToBottom())
        },
        step: (d) => {
          const hasExecuting = d.toolCalls && d.toolCalls.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this.logItems = this.logItems.filter(item => !(item.type === 'step' && item.iteration === d.iteration && item._executing))
            this.logItems.push(this.withLogId({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration, _executing: true }))
          } else {
            this.logItems = this.logItems.filter(item => !(item.type === 'step' && item.iteration === d.iteration && item._executing))
            this.logItems.push(this.withLogId({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration }))
          }
          if (d.usage && d.usage.promptTokens) this.promptTokens = d.usage.promptTokens
          this.$nextTick(() => this.scrollToBottom())
        },
        compact: () => {
          if (this.sessionId) this.loadMessages()
        },
        done: (d) => {
          if (d && d.sessionId && this.sessionId && d.sessionId !== this.sessionId) return
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.disabled = false
          this.stopping = false
          if (d.modelName) this.$emit('update:modelName', d.modelName)
          if (d.usage && d.usage.promptTokens) this.promptTokens = d.usage.promptTokens
          if (d.response) {
            this.logItems.push(this.withLogId({ type: 'think', content: d.response }))
            this.$nextTick(() => this.scrollToBottom())
          }
        },
        stopped: () => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.disabled = false
          this.stopping = false
          this.logItems.push(this.withLogId({ type: 'think', content: '【已停止】' }))
          this.$nextTick(() => this.scrollToBottom())
        },
        error: (d) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          alert(d.error || '发生错误')
          this.disabled = false
          this.stopping = false
        }
      })
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const r = await getMessages(this.sessionId)
        this.logItems = (r.data || []).map(i => {
          if (i.type === 'think') return this.withLogId({ type: 'think', content: i.content || '' })
          if (i.type === 'step') return this.withLogId(i)
          return this.withLogId(i)
        })
      } catch (e) {
        this.logItems = []
      }
      this.$nextTick(() => this.scrollToBottom())
    },
    withLogId(item) {
      return { ...item, logId: ++logSeq }
    },
    scrollToBottom() {
      const el = this.$refs.messagesContainer
      if (el) {
        this.$nextTick(() => { el.scrollTop = el.scrollHeight })
      }
    },
    renderMarkdown(text) {
      if (!text) return ''
      try { return marked.parse(text) } catch { return String(text) }
    },
    getToolCallName(tc) {
      return tc ? (tc.function ? tc.function.name : tc.name) : 'unknown_tool'
    },
    getToolCallArguments(tc) {
      return tc && tc.function ? tc.function.arguments : (tc.arguments || '')
    },
    formatInput(action, input) {
      if (!input) return ''
      try {
        const parsed = JSON.parse(input)
        if (action === 'bash' || action === 'execute_bash') return parsed.command + (parsed.workdir ? ' (' + parsed.workdir + ')' : '')
        if (action === 'read_file') return parsed.file_path + (parsed.offset ? ':' + parsed.offset : '')
        if (action === 'edit_file' || action === 'write_file') return parsed.file_path || ''
        return input
      } catch { return input }
    },
    getTodoStatusIcon(status) {
      const icons = { completed: '✓', in_progress: '◉', pending: '○', cancelled: '✗' }
      return icons[status] || '○'
    }
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
      this.wsUnsubscribe = null
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 900px; max-width: 92vw; height: 85vh; max-height: 800px; min-height: 500px;
  display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  flex-shrink: 0;
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 16px; }
.chat-messages { font-size: 13px; line-height: 1.6; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 30px; font-size: 13px; }
.user-msg { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.user-bubble {
  background: var(--accent-light); color: var(--accent); padding: 8px 14px;
  border-radius: 10px 2px 10px 10px; max-width: 80%; word-break: break-word; font-weight: 600;
}
.ai-thought { color: var(--text-primary); margin-bottom: 12px; line-height: 1.6; }
.ai-thought :deep(p) { margin: 4px 0; }
.ai-thought :deep(pre) { background: #f1f2f6; border-radius: 4px; padding: 6px 10px; font-size: 11px; overflow-x: auto; margin: 4px 0; }
.log-mute { color: var(--text-muted); padding: 3px 0; font-size: 12px; }
.tool-success { color: #22c55e; font-weight: 600; }
.tool-fail { color: #ef4444; font-weight: 600; }
.tool-input { color: var(--accent); margin-left: 6px; font-size: 11px; }
.todos-list { margin-bottom: 12px; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 12.5px; }
.todo-status { flex-shrink: 0; }
.todo-name { color: var(--text-primary); }
.system-msg { color: var(--text-muted); margin-bottom: 12px; font-size: 12px; font-style: italic; }
.typing-indicator { padding: 8px 0; }
.typing-dot { animation: typing 1.4s ease-in-out infinite; color: var(--accent); }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

.input-area { padding: 10px 14px; border-top: 1px solid var(--border); background: var(--bg-input); flex-shrink: 0; }
.input-wrapper { background: #fff; border-radius: 8px; border: 1px solid var(--border); overflow: hidden; }
.input-wrapper textarea {
  width: 100%; border: none; outline: none; resize: none; padding: 10px 12px;
  font-size: 13px; font-family: inherit; color: var(--text-primary); line-height: 1.5;
  background: transparent; min-height: 60px; box-sizing: border-box;
}
.input-wrapper textarea:disabled { opacity: 0.7; background: #f9fafb; }
.input-wrapper textarea::placeholder { color: var(--text-muted); }
.input-actions {
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  font-size: 12px; color: var(--text-muted); padding: 4px 8px; border-top: 1px solid var(--border);
}
.sep { color: var(--border); user-select: none; }
.status-ready { color: #22c55e; font-weight: 500; }
.status-thinking { color: var(--accent); display: flex; align-items: center; gap: 6px; font-weight: 500; }
.thinking-spinner {
  width: 10px; height: 10px; border: 2px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%; display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.actions-spacer { flex: 1; }
.action-btn {
  font-size: 12px; padding: 5px 12px; border-radius: 5px; border: none; cursor: pointer;
  font-family: inherit; transition: all 0.15s;
}
.btn-test { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
.btn-test:hover { border-color: var(--accent); color: var(--accent); }
.btn-test:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: #ef4444; color: #fff; }
.btn-stop:hover { background: #dc2626; }
.btn-stop:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-send { background: var(--accent); color: #fff; }
.btn-send:hover { background: #6366f1; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.tool-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.8s linear infinite;
  margin-right: 6px; vertical-align: middle;
}
</style>
