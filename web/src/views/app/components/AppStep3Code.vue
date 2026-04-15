<template>
  <div class="step3-code">
    <div class="action-bar">
      <button class="action-btn primary" @click="insertGenerateCommand" :disabled="disabled">
        <i class="fa-solid fa-code"></i> 生成代码
      </button>
    </div>

    <div class="chat-section">
      <div class="chat-header">
        <span>代码生成</span>
        <span class="chat-status" :class="disabled ? 'thinking' : 'ready'">
          {{ disabled ? '生成中...' : '就绪' }}
        </span>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div v-if="!logItems.length" class="empty-state">
          <i class="fa-solid fa-code"></i>
          <p>点击按钮或输入需求生成代码</p>
        </div>
        <template v-for="(item, idx) in logItems" :key="idx">
          <div v-if="item.type === 'chat' || item.type === 'think'" class="user-question">
            {{ item.content }}
          </div>
          <div v-else-if="item.type === 'system'" class="system-message">
            {{ item.content }}
          </div>
          <template v-else-if="item.type === 'step'">
            <div v-if="item.thought" class="ai-thought">{{ item.thought }}</div>
            <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="tool-call">
              <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                {{ item.success !== false ? '✓' : '✗' }}
              </span>
              {{ tc.function.name }}
            </div>
          </template>
        </template>
      </div>

      <div class="chat-input">
        <textarea
          v-model="inputMessage"
          placeholder="输入代码修改要求... (Enter发送)"
          :disabled="disabled"
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        <button v-if="disabled" class="stop-btn" @click="stopChat">■</button>
        <button v-else class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim()">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../../api'

export default {
  name: 'AppStep3Code',
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      logItems: [],
      sessionId: ''
    }
  },
  computed: {
    specFilePath() {
      if (!this.category || !this.name) return ''
      return `${this.reqBasePath}/${this.category}/${this.name}/${this.name}_方案.md`
    }
  },
  watch: {
    category: { handler() { this.loadSession() } },
    name: { handler() { this.loadSession() } }
  },
  async mounted() {
    await this.loadSession()
    api.ws.init()
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
    }
  },
  methods: {
    async loadSession() {
      if (!this.category || !this.name) {
        this.sessionId = ''
        return
      }
      try {
        const sessionFilePath = `${this.reqBasePath}/${this.category}/${this.name}/session.json`
        const fileRes = await api.getFileContent(sessionFilePath)
        if (fileRes && fileRes.content) {
          const sessionData = JSON.parse(fileRes.content)
          this.sessionId = sessionData.codeSessionId || ''
        } else {
          this.sessionId = ''
        }
        if (this.sessionId) {
          await this.loadMessages()
          this.subscribeSession()
        }
      } catch (e) {
        console.error('Load session failed:', e)
        this.sessionId = ''
      }
    },
    insertGenerateCommand() {
      if (this.specFilePath) {
        this.inputMessage = `根据 ${this.specFilePath} 方案开发相应功能，先不要修改方案文档。`
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.disabled || !this.sessionId) return

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.logItems.push({ type: 'chat', content })

      api.sessionWsSend(this.sessionId, 'chat', { message: content, sessionId: this.sessionId })
    },
    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      api.sessionWsSend(this.sessionId, 'stop', { sessionId: this.sessionId })
    },
    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()

      this.wsUnsubscribe = api.wsSubscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          this.disabled = runningIds.includes(this.sessionId)
        },
        step: (data) => {
          this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
          this.scrollToBottom()
        },
        done: (data) => {
          this.disabled = false
          this.stopping = false
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.scrollToBottom()
        },
        stopped: () => {
          this.disabled = false
          this.stopping = false
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.scrollToBottom()
        },
        error: (data) => {
          this.$message.error(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
        }
      })
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) container.scrollTop = container.scrollHeight
      })
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        this.logItems = res.data || []
        this.scrollToBottom()
      } catch (e) {
        console.error('Load messages failed:', e)
      }
    }
  }
}
</script>

<style scoped>
.step3-code {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a09;
}

.action-bar {
  display: flex;
  padding: 12px 16px;
  background: #121212;
  border-bottom: 1px solid #27272a;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn:hover {
  opacity: 0.9;
}

.action-btn:disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #121212;
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
}

.chat-status {
  font-size: 12px;
  font-weight: normal;
}

.chat-status.thinking {
  color: #3b82f6;
}

.chat-status.ready {
  color: #22c55e;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #52525b;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.user-question {
  color: #60a5fa;
  font-weight: 500;
  margin-bottom: 12px;
}

.ai-thought {
  color: #d4d4d8;
  margin-bottom: 12px;
}

.tool-call {
  color: #84848a;
  margin-bottom: 8px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }

.system-message {
  color: #a1a1aa;
  font-style: italic;
  margin-bottom: 12px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #121212;
  border-top: 1px solid #27272a;
}

.chat-input textarea {
  flex: 1;
  padding: 10px 12px;
  background: #0a0a09;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 14px;
  resize: none;
  outline: none;
}

.chat-input textarea:focus {
  border-color: #3b82f6;
}

.stop-btn,
.send-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.stop-btn {
  background: #ef4444;
  color: white;
}

.send-btn {
  background: #3b82f6;
  color: white;
}

.send-btn:disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}
</style>
