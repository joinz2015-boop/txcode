<template>
  <div class="coding-panel">
    <div class="panel-header">
      <span class="panel-header-title"># {{ sessionTitle }}</span>
      <span class="content-header-badge">{{ currentAgent }}</span>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="logItems.length === 0" class="welcome">
        <div class="welcome-logo">T</div>
        <h2 class="welcome-title">{{ currentSession && !panel.sessionId ? '新方案会话' : '欢迎使用 txcode' }}</h2>
        <p class="welcome-desc">{{ currentSession && !panel.sessionId ? '发送第一条消息后将自动创建编码会话' : 'AI 编码助手 · 选择左侧会话开始' }}</p>
      </div>
      <DesktopChatMessage
        v-for="(item, idx) in logItems"
        :key="item.logId || idx"
        :item="item"
      />
      <div v-if="disabled && !stopping" class="chat-msg">
        <div class="chat-msg-avatar ai">AI</div>
        <div class="chat-msg-content">
          <div class="chat-msg-header">{{ currentAgent }} · 正在输入...</div>
          <div class="chat-msg-text">
            <span class="typing-dot">●</span>
            <span class="typing-dot">●</span>
            <span class="typing-dot">●</span>
          </div>
        </div>
      </div>
    </div>
    <div class="code-input-block">
      <div class="code-input-wrapper">
        <textarea
          class="code-textarea"
          v-model="inputText"
          placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行)"
          rows="3"
          :disabled="disabled"
          @keydown="handleKeydown"
        ></textarea>
        <div class="code-input-actions">
          <div class="code-input-actions-left">
            <span class="input-status" :style="{ color: disabled ? '#f59e0b' : '#22c55e' }">
              {{ disabled ? (stopping ? '■ 停止中' : '● 处理中') : '✓ 就绪' }}
            </span>
            <span class="input-sep">|</span>
            <span class="input-action" @click="openModelSelect">模型: {{ currentModel }} ▾</span>
            <span class="input-sep">|</span>
            <span>会话: {{ sessionIdDisplay }}</span>
            <span class="input-sep">|</span>
            <span>token: {{ panel.promptTokens }}</span>
            <template v-if="planFilePath">
              <span class="input-sep">|</span>
              <span class="input-action" @click="fillDevPlan">生成代码</span>
            </template>
          </div>
          <div class="code-input-actions-right">
            <button v-if="disabled && !stopping" class="input-btn btn-stop" @click="stopSending">■ 停止</button>
            <button v-if="disabled && stopping" class="input-btn btn-stop" disabled>停止中...</button>
            <button class="input-btn btn-send-code" @click="sendMessage" :disabled="disabled">发送</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopChatMessage from './DesktopChatMessage.vue'
import { getItem, setItem } from '@/utils/storage'
import { createSession, getMessages } from '@/api/index'
import { saveMeta } from '@/api/index'
import { ws } from '@/utils/websocket'

let logSeq = 0

export default {
  name: 'DesktopCodingPanel',
  components: { DesktopChatMessage },
  props: {
    currentAgent: { type: String, default: 'Code Agent' },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null },
    runningSessionIds: { type: Array, default: () => [] },
    planFilePath: { type: String, default: '' }
  },
  data() {
    return {
      inputText: '',
      panel: this.createPanel(),
      stopping: false
    }
  },
  computed: {
    logItems() {
      return this.panel.logItems
    },
    disabled() {
      return this.panel.disabled
    },
    sessionTitle() {
      if (this.currentSession) {
        return this.currentSession.meta.sessionName || this.currentSession.folderName || 'AI 编码对话'
      }
      return 'AI 编码对话'
    },
    sessionIdDisplay() {
      return this.panel.sessionId ? 'sess_' + this.panel.sessionId.substring(0, 8) : '未创建'
    }
  },
  watch: {
    currentSession: {
      handler(val, oldVal) {
        if (!val) {
          this.unsubscribePanel()
          this.panel = this.createPanel()
          return
        }
        if (oldVal && oldVal.folderName === val.folderName) return
        this.initSession(val)
      },
      immediate: true
    },
    runningSessionIds(ids) {
      if (this.panel.sessionId && ids.includes(this.panel.sessionId)) {
        this.panel.disabled = true
      } else if (!this.stopping) {
        this.panel.disabled = false
      }
    }
  },
  methods: {
    createPanel() {
      return {
        sessionId: null,
        logItems: [],
        disabled: false,
        modelName: '',
        promptTokens: 0,
        wsUnsubscribe: null
      }
    },

    async initSession(session) {
      this.saveCodeScrollTop()
      this.unsubscribePanel()
      this.panel = this.createPanel()

      const meta = session.meta || {}
      if (meta.codeSessionId) {
        this.panel.sessionId = meta.codeSessionId
        await this.loadMessages(meta.codeSessionId)
        this.subscribePanel(meta.codeSessionId)
      }
      if (this.currentModel) {
        this.panel.modelName = this.currentModel
      }
      this.$nextTick(() => this.restoreCodeScrollTop())
    },

    saveCodeScrollTop() {
      const el = this.$refs.messagesContainer
      if (el) {
        setItem('coding:scrollTop', el.scrollTop)
      }
    },

    restoreCodeScrollTop() {
      const el = this.$refs.messagesContainer
      if (el) {
        const top = getItem('coding:scrollTop', 0)
        if (top > 0) {
          this.$nextTick(() => { el.scrollTop = top })
        }
      }
    },

    unsubscribePanel() {
      if (this.panel.wsUnsubscribe) {
        this.panel.wsUnsubscribe()
        this.panel.wsUnsubscribe = null
      }
    },

    async ensureCodeSession() {
      let sid = this.panel.sessionId
      if (!sid) {
        const sessionName = this.currentSession ? (this.currentSession.meta.sessionName || this.currentSession.folderName) : '新会话'
        const r = await createSession(sessionName)
        sid = r.data.id
        this.panel.sessionId = sid

        if (this.currentSession) {
          const meta = { ...this.currentSession.meta, codeSessionId: sid, updatedAt: new Date().toISOString() }
          await saveMeta(this.currentSession.folderName, meta)
          this.currentSession.meta = meta
          setItem('planSession:current', this.currentSession)
        }
      }
      return sid
    },

    subscribePanel(sessionId) {
      if (!sessionId) return
      if (this.panel.wsUnsubscribe) this.panel.wsUnsubscribe()

      this.panel.wsUnsubscribe = ws.subscribe(sessionId, {
        step: (d) => {
          const hasExecuting = d.toolCalls && d.toolCalls.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this.panel.logItems = this.panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.panel.logItems.push(this.withLogId({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration, _executing: true }))
          } else {
            this.panel.logItems = this.panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.pushLogItem({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration })
          }
          if (d.usage && d.usage.promptTokens) this.panel.promptTokens = d.usage.promptTokens
          this.$nextTick(() => this.scrollToBottom())
        },
        done: (d) => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          if (d.modelName) this.panel.modelName = d.modelName
          if (d.usage && d.usage.promptTokens) this.panel.promptTokens = d.usage.promptTokens
          if (d.response) {
            this.pushLogItem({ type: 'think', content: d.response })
            this.$nextTick(() => this.scrollToBottom())
          }
        },
        stopped: () => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          this.pushLogItem({ type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollToBottom())
        },
        error: (d) => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          alert(d.error || '发生错误')
        },
        todos: (d) => {
          this.pushLogItem({ type: 'todos', todos: d.todos })
          this.$nextTick(() => this.scrollToBottom())
        },
        compact: () => {
          if (this.panel.sessionId) this.loadMessages(this.panel.sessionId)
        },
        running_sessions: (d) => {
          const runningIds = d.runningSessionIds || []
          if (this.panel.sessionId && runningIds.includes(this.panel.sessionId)) {
            this.panel.disabled = true
          } else if (!this.stopping) {
            this.panel.disabled = false
          }
        }
      })
    },

    async loadMessages(sessionId) {
      try {
        const r = await getMessages(sessionId)
        this.panel.logItems = (r.data || []).map(i => {
          if (i.type === 'think') return this.withLogId({ type: 'think', content: i.content || '' })
          if (i.type === 'step') return this.withLogId(i)
          return this.withLogId(i)
        })
      } catch (e) {
        this.panel.logItems = []
      }
      this.$nextTick(() => this.scrollToBottom())
    },

    pushLogItem(item) {
      this.panel.logItems.push(this.withLogId(item))
      const max = 400
      if (this.panel.logItems.length > max) {
        this.panel.logItems.splice(0, this.panel.logItems.length - max)
      }
    },

    withLogId(item) {
      return { ...item, logId: ++logSeq }
    },

    open(data) {
      if (data && data.sessionId) {
        this.unsubscribePanel()
        this.panel = this.createPanel()
        this.panel.sessionId = data.sessionId
        this.subscribePanel(data.sessionId)
        this.loadMessages(data.sessionId)
      }
    },
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },
    async sendMessage() {
      const val = this.inputText.trim()
      if (!val || this.panel.disabled) return

      try {
        const sid = await this.ensureCodeSession()
        this.subscribePanel(sid)
        const payload = {
          message: val,
          sessionId: sid,
          modelName: this.panel.modelName || undefined
        }
        this.pushLogItem({ type: 'chat', content: val, role: 'user' })
        this.inputText = ''
        this.panel.disabled = true
        this.stopping = false
        ws.send('chat', payload)

        if (this.currentSession && this.currentSession.meta.sessionName === '新计划会话') {
          ws.send('name_session', { sessionId: sid, folderName: this.currentSession.folderName, userInput: val })
        }
        this.$nextTick(() => this.scrollToBottom())
      } catch (e) {
        console.error('发送失败:', e)
        alert('发送失败: ' + e.message)
      }
    },
    stopSending() {
      if (!this.panel.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.panel.sessionId })
    },
    openModelSelect() {
      this.$emit('update:agent', this.currentAgent)
      this.$emit('update:model', this.currentModel)
    },
    fillDevPlan() {
      if (!this.planFilePath) return
      this.inputText = `请根据以下方案文件生成代码：${this.planFilePath}`
    },
    scrollToBottom() {
      const el = this.$refs.messagesContainer
      if (el) {
        this.$nextTick(() => {
          el.scrollTop = el.scrollHeight
        })
      }
    }
  }
}
</script>

<style scoped>
.coding-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  background: var(--bg-chat);
}
.panel-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.content-header-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.welcome {
  text-align: center;
  padding: 32px 0 20px;
}
.welcome-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 16px rgba(79,110,247,0.25);
}
.welcome-title {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.welcome-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-muted);
}
.code-input-block {
  background: var(--bg-input);
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.code-input-wrapper {
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.code-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  line-height: 1.5;
  background: transparent;
  min-height: 60px;
}
.code-textarea:disabled {
  opacity: 0.7;
  background: #f9fafb;
}
.code-textarea::placeholder {
  color: var(--text-muted);
}
.code-input-actions {
  display: flex;
  gap: 0;
  flex-wrap: wrap;
  align-items: center;
  font-size: 11.5px;
  color: var(--text-muted);
  padding: 5px 10px;
  border-top: 1px solid var(--border);
  justify-content: space-between;
}
.code-input-actions-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.code-input-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.input-status { font-weight: 500; }
.input-sep { color: var(--border); user-select: none; }
.input-action { cursor: pointer; transition: color 0.15s; }
.input-action:hover { color: var(--accent); }
.input-btn {
  font-size: 11.5px;
  padding: 4px 11px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-upload {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
}
.btn-upload:hover { border-color: var(--accent); color: var(--accent); }
.btn-stop { background: #ef4444; color: #fff; }
.btn-stop:hover { background: #dc2626; }
.btn-stop:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-send-code { background: var(--accent); color: #fff; }
.btn-send-code:hover { background: #6366f1; }
.btn-send-code:disabled { opacity: 0.6; cursor: not-allowed; }

.chat-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.chat-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.chat-msg-avatar.ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff;
}
.chat-msg-content { flex: 1; min-width: 0; }
.chat-msg-header {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 3px;
}
.chat-msg-text {
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.65;
  background: #f8f9fb;
  padding: 10px 14px;
  border-radius: 2px 10px 10px 10px;
  border: 1px solid var(--border);
}
@keyframes typing {
  0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; }
}
.typing-dot { animation: typing 1.4s ease-in-out infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
</style>
