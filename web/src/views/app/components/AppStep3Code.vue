<template>
  <div class="step3-code">
    <div class="chat-toolbar">
      <span class="model-name" @click="showModelDrawer = true">
        {{ modelName || 'gpt-4o' }}
        <i class="fa-solid fa-chevron-down"></i>
      </span>
      <button class="toolbar-btn" @click="insertGenerateCommand" :disabled="isProcessing">
        <i class="fa-solid fa-code"></i>
      </button>
      <button class="toolbar-btn" @click="showCommandDrawer = true">
        <i class="fa-solid fa-terminal"></i>
      </button>
      <button class="toolbar-btn" @click="showFileDrawer = true">
        <i class="fa-solid fa-file-circle-plus"></i>
      </button>
    </div>

    <div class="chat-area" ref="chatArea">
      <div v-if="!logItems.length" class="empty-state">
        <i class="fa-solid fa-code"></i>
        <p>描述代码需求，AI将生成代码</p>
      </div>

      <template v-for="(item, idx) in logItems" :key="item._id || idx">
        <div v-if="item.type === 'chat'" class="message user">
          <div class="message-bubble">{{ item.content }}</div>
        </div>

        <div v-else-if="item.type === 'think'" class="message assistant">
          <div class="message-bubble" v-html="renderMarkdown(item.content)"></div>
        </div>

        <div v-else-if="item.type === 'step'" class="step-block">
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
            <span class="tool-name">{{ tc?.function?.name || 'unknown' }}</span>
            <span class="tool-args">{{ formatToolArgs(tc) }}</span>
          </div>
        </div>

        <div v-else-if="item.type === 'system'" class="message assistant">
          <div class="message-bubble system">{{ item.content }}</div>
        </div>

        <div v-else-if="item.type === 'todos'" class="message assistant">
          <div class="todo-list">
            <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
              <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
              <span>{{ todo.name }}</span>
            </div>
          </div>
        </div>
      </template>

      <div v-if="isProcessing" class="message assistant thinking">
        <div class="message-bubble">生成中...</div>
      </div>
    </div>

    <div class="input-area">
      <div class="input-wrapper">
        <textarea
          ref="inputField"
          v-model="inputMessage"
          class="input-field"
          placeholder="描述代码需求... (Enter发送)"
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

    <div class="status-bar">
      <span class="status-indicator">
        <span class="status-dot" :class="{ processing: isProcessing }"></span>
        {{ isProcessing ? '生成中...' : '就绪' }}
      </span>
      <span>Token: {{ promptTokens || 0 }}</span>
    </div>

    <div class="drawer-overlay" :class="{ show: showModelDrawer || showCommandDrawer || showFileDrawer }" @click="closeAllDrawers"></div>

    <FileSelectDrawer
      :visible="showFileDrawer"
      @select="onFileSelected"
      @close="showFileDrawer = false"
    />

    <div class="model-drawer" :class="{ show: showModelDrawer }">
      <div class="drawer-header">
        <span class="drawer-title">选择模型</span>
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
        <span class="drawer-title">快捷命令</span>
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
import { ws } from '../../../api/websocket/websocket_client.js'
import * as sessions from '../../../api/sessions.js'
import { api } from '../../../api'
import FileSelectDrawer from './chat/FileSelectDrawer.vue'

export default {
  name: 'AppStep3Code',
  components: {
    FileSelectDrawer
  },
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      inputMessage: '',
      isProcessing: false,
      stopping: false,
      logItems: [],
      sessionId: '',
      modelName: '',
      promptTokens: 0,
      showModelDrawer: false,
      showCommandDrawer: false,
      showFileDrawer: false,
      models: [],
      logSeq: 0,
      wsUnsubscribe: null
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
    ws.init()
    await this.loadModels()
    await this.loadDefaultModel()
    await this.loadSession()
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
    }
  },
  methods: {
    async loadModels() {
      try {
        const res = await api.getModels()
        this.models = res.data || []
      } catch (e) {
        console.error('Load models failed:', e)
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
    selectModel(model) {
      const parts = model.name.split('/')
      this.modelName = parts.length > 2 ? parts.slice(1).join('/') : model.name
      api.setConfig('defaultModel', this.modelName)
      this.showModelDrawer = false
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
          this.sessionId = sessionData.codeSessionId || ''
        } else {
          this.sessionId = ''
        }
        if (this.sessionId) {
          await this.loadMessages()
          this.subscribeSession()
        }
      } catch (e) {
        this.sessionId = ''
      }
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await sessions.getMessages(this.sessionId)
        this.logItems = (res.data || []).map(item => {
          if (item.type === 'think') return { type: 'think', content: item.content || '', _id: `log-${++this.logSeq}` }
          if (item.type === 'step') return { type: 'step', thought: item.thought, toolCalls: item.toolCalls || [], success: item.success, _id: `log-${++this.logSeq}` }
          if (item.type === 'chat') return { type: 'chat', content: item.content, _id: `log-${++this.logSeq}` }
          if (item.type === 'todos') return { type: 'todos', todos: item.todos || [], _id: `log-${++this.logSeq}` }
          return { type: 'system', content: String(item), _id: `log-${++this.logSeq}` }
        })
        this.scrollToBottom()
      } catch (e) {
        console.error('Load messages failed:', e)
      }
    },
    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()

      this.wsUnsubscribe = ws.subscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          this.isProcessing = runningIds.includes(this.sessionId)
        },
        todos: (data) => {
          this.logItems.push({ type: 'todos', todos: data.todos, _id: `log-${++this.logSeq}` })
          this.scrollToBottom()
        },
        step: (data) => {
          this.logItems.push({ type: 'step', thought: data?.thought, toolCalls: data?.toolCalls || [], success: data?.success, _id: `log-${++this.logSeq}` })
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollToBottom()
        },
        compact: (data) => {
          this.logItems.push({ type: 'system', content: `【压缩完成】${data.summary || ''}`, _id: `log-${++this.logSeq}` })
          this.loadMessages()
        },
        done: (data) => {
          this.isProcessing = false
          this.stopping = false
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) {
            this.logItems.push({ type: 'think', content: data.response, _id: `log-${++this.logSeq}` })
          }
          this.scrollToBottom()
        },
        stopped: () => {
          this.isProcessing = false
          this.stopping = false
          this.logItems.push({ type: 'think', content: '【已停止】', _id: `log-${++this.logSeq}` })
          this.scrollToBottom()
        },
        error: (data) => {
          this.isProcessing = false
          this.stopping = false
          this.$message.error(data?.error || '发生错误')
        }
      })
    },
    insertGenerateCommand() {
      if (this.specFilePath) {
        this.inputMessage = `根据 ${this.specFilePath} 方案开发相应功能，先不要修改方案文档。`
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.isProcessing || !this.sessionId) return

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      this.inputMessage = ''
      this.isProcessing = true
      this.logItems.push({ type: 'chat', content, _id: `log-${++this.logSeq}` })
      this.scrollToBottom()

      ws.send('chat', { message: content, sessionId: this.sessionId, modelName: this.modelName || undefined })
    },
    stopGeneration() {
      if (!this.sessionId) return
      this.isProcessing = false
      this.stopping = true
      ws.send('stop', { sessionId: this.sessionId })
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
    closeAllDrawers() {
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
    formatToolArgs(toolCall) {
      try {
        const args = JSON.parse(toolCall?.function?.arguments || '{}')
        if (args.file_path) return args.file_path
        if (args.command) return args.command
        return ''
      } catch {
        return ''
      }
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
.step3-code {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a09;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #121212;
  border-bottom: 1px solid #27272a;
  flex-shrink: 0;
}

.model-name {
  flex: 1;
  color: #3b82f6;
  font-size: 13px;
  cursor: pointer;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #18191b;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #d4d4d8;
  cursor: pointer;
  font-size: 14px;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #52525b;
  font-size: 14px;
  min-height: 100px;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
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
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-bubble {
  background: #3b82f6;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-bubble {
  background: #121212;
  border: 1px solid #27272a;
  border-bottom-left-radius: 4px;
  color: #d4d4d8;
}

.message.assistant.thinking .message-bubble {
  background: linear-gradient(135deg, #121212, #18191b);
}

.message-bubble.system {
  font-style: italic;
  color: #a1a1aa;
}

.step-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-log {
  font-size: 12px;
  color: #84848a;
  padding: 8px 12px;
  background: #18191b;
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-name { color: #3b82f6; }
.tool-args { color: #84848a; }

.todo-list {
  background: #121212;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 10px 14px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
  color: #d4d4d8;
}

.todo-item:not(:last-child) {
  border-bottom: 1px solid #27272a;
}

.todo-status {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.input-area {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #121212;
  border-top: 1px solid #27272a;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
}

.input-field {
  width: 100%;
  min-height: 44px;
  max-height: 100px;
  padding: 10px 14px;
  background: #0a0a09;
  border: 1px solid #27272a;
  border-radius: 20px;
  color: #f4f4f5;
  font-size: 14px;
  resize: none;
  outline: none;
}

.input-field:focus {
  border-color: #3b82f6;
}

.input-field::placeholder {
  color: #52525b;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: #3b82f6;
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-btn:disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}

.stop-btn {
  background: #ef4444;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: #121212;
  border-top: 1px solid #27272a;
  font-size: 11px;
  color: #84848a;
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
  background: #22c55e;
}

.status-dot.processing {
  background: #ef4444;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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

.model-drawer,
.command-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 430px;
  margin: 0 auto;
  background: #121212;
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.model-drawer.show,
.command-drawer.show {
  transform: translateY(0);
}

.drawer-header {
  padding: 16px;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
  color: #f4f4f5;
}

.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #18191b;
  border: none;
  color: #84848a;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.command-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  transition: background 0.2s;
  cursor: pointer;
}

.command-item:active {
  background: #18191b;
}

.command-item.active {
  background: rgba(59, 130, 246, 0.1);
}

.command-icon {
  width: 40px;
  height: 40px;
  background: #18191b;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  flex-shrink: 0;
}

.command-item.active .command-icon {
  background: #3b82f6;
  color: white;
}

.command-info {
  flex: 1;
  min-width: 0;
}

.command-name {
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
  margin-bottom: 4px;
}

.command-desc {
  font-size: 12px;
  color: #84848a;
}

.message-bubble :deep(p) {
  margin: 0 0 10px 0;
}

.message-bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble :deep(code) {
  background: #18191b;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
