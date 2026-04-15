<template>
  <div class="step2-design">
    <div class="mode-tabs">
      <button
        class="tab-btn"
        :class="{ active: mode === 'edit' }"
        @click="mode = 'edit'"
      >
        <i class="fa-solid fa-edit"></i> 编辑
      </button>
      <button
        class="tab-btn"
        :class="{ active: mode === 'preview' }"
        @click="mode = 'preview'"
      >
        <i class="fa-solid fa-eye"></i> 预览
      </button>
    </div>

    <div v-if="mode === 'edit'" class="editor-area">
      <div class="editor-toolbar">
        <button class="toolbar-btn" @click="saveSpec" :disabled="disabled">
          <i class="fa-solid fa-save"></i> 保存
        </button>
      </div>
      <textarea
        v-model="specContent"
        class="markdown-editor"
        placeholder="输入方案内容..."
        @keydown.ctrl.s.prevent="saveSpec"
      ></textarea>
    </div>

    <div v-else class="preview-area">
      <div class="preview-content" v-html="renderedContent"></div>
    </div>

    <div class="divider"></div>

    <div class="chat-section">
      <div class="chat-header">
        <span>AI 助手</span>
        <span class="chat-status" :class="disabled ? 'thinking' : 'ready'">
          {{ disabled ? '思考中...' : '就绪' }}
        </span>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div v-if="!logItems.length" class="empty-state">
          <p>输入需求描述，AI将协助完善方案</p>
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
          placeholder="输入消息... (Enter发送)"
          :disabled="disabled"
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        <button v-if="disabled" class="stop-btn" @click="stopChat">■ 停止</button>
        <button v-else class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim()">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../../api'
import { marked } from 'marked'

export default {
  name: 'AppStep2Design',
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      mode: 'edit',
      specContent: '',
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
    },
    renderedContent() {
      return marked(this.specContent || '')
    }
  },
  watch: {
    category: { handler() { this.loadData() } },
    name: { handler() { this.loadData() } }
  },
  async mounted() {
    await this.loadData()
    api.ws.init()
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
    }
  },
  methods: {
    async loadData() {
      await Promise.all([this.loadSpec(), this.loadSession()])
    },
    async loadSpec() {
      if (!this.category || !this.name) {
        this.specContent = ''
        return
      }
      try {
        const res = await api.getFileContent(this.specFilePath)
        this.specContent = res.content || ''
      } catch (e) {
        console.error('Load spec failed:', e)
        this.specContent = ''
      }
    },
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
          this.sessionId = sessionData.designSessionId || ''
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
    async saveSpec() {
      if (!this.specFilePath) return
      try {
        await api.writeFile(this.specFilePath, this.specContent)
        this.$emit('save-spec', this.specContent)
        this.$emit('spec-updated')
      } catch (e) {
        console.error('Save spec failed:', e)
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.disabled || !this.sessionId) return

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      const contextMsg = `先在 ${this.specFilePath} 生成方案，先不要修改代码。\n\n用户输入: ${content}`

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.logItems.push({ type: 'chat', content })

      api.sessionWsSend(this.sessionId, 'chat', { message: contextMsg, sessionId: this.sessionId })
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
          this.$emit('spec-updated')
          this.loadSpec()
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
.step2-design {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a09;
}

.mode-tabs {
  display: flex;
  background: #121212;
  border-bottom: 1px solid #27272a;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: none;
  border: none;
  color: #84848a;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom: 2px solid #3b82f6;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.editor-toolbar {
  display: flex;
  padding: 8px 16px;
  background: #121212;
  border-bottom: 1px solid #27272a;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.toolbar-btn:disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}

.markdown-editor {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: #121212;
  border: none;
  color: #f4f4f5;
  font-size: 14px;
  font-family: ui-monospace, monospace;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.preview-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #121212;
}

.preview-content {
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.7;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3) {
  color: #f4f4f5;
  margin: 16px 0 8px;
}

.preview-content :deep(code) {
  background: #27272a;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.preview-content :deep(pre) {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}

.divider {
  height: 1px;
  background: #27272a;
}

.chat-section {
  height: 50%;
  display: flex;
  flex-direction: column;
  min-height: 250px;
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
  text-align: center;
  color: #52525b;
  padding: 24px 0;
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
