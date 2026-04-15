<template>
  <div class="step2-design">
    <div class="mode-tabs">
      <button
        class="tab-btn"
        :class="{ active: mode === 'chat' }"
        @click="mode = 'chat'"
      >
        <i class="fa-solid fa-robot"></i> AI方案助手
      </button>
      <button
        class="tab-btn"
        :class="{ active: mode === 'spec' }"
        @click="mode = 'spec'"
      >
        <i class="fa-solid fa-file-alt"></i> 方案
      </button>
    </div>

    <div v-if="mode === 'chat'" class="chat-mode">
      <div class="chat-toolbar">
        <span class="model-name" @click="showModelDrawer = true">
          {{ modelName || 'gpt-4o' }}
          <i class="fa-solid fa-chevron-down"></i>
        </span>
        <button class="toolbar-btn" @click="showCommandDrawer = true">
          <i class="fa-solid fa-terminal"></i>
        </button>
        <button class="toolbar-btn" @click="showFileDrawer = true">
          <i class="fa-solid fa-file-circle-plus"></i>
        </button>
      </div>

      <div class="chat-area" ref="chatArea">
        <div v-if="!logItems.length" class="empty-state">
          <p>描述你的需求，AI将协助完善方案</p>
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
          <div class="message-bubble">思考中...</div>
        </div>
      </div>

      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputField"
            v-model="inputMessage"
            class="input-field"
            placeholder="描述需求... (Enter发送)"
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
          {{ isProcessing ? '处理中...' : '就绪' }}
        </span>
        <span>Token: {{ promptTokens || 0 }}</span>
      </div>
    </div>

    <div v-else class="spec-mode">
      <div class="spec-tabs">
        <button
          class="spec-tab-btn"
          :class="{ active: specView === 'edit' }"
          @click="specView = 'edit'"
        >
          <i class="fa-solid fa-edit"></i> 编辑
        </button>
        <button
          class="spec-tab-btn"
          :class="{ active: specView === 'preview' }"
          @click="specView = 'preview'"
        >
          <i class="fa-solid fa-eye"></i> 预览
        </button>
      </div>

      <div v-if="specView === 'edit'" class="editor-area">
        <div class="editor-toolbar">
          <button class="toolbar-btn primary" @click="saveSpec">
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
  name: 'AppStep2Design',
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
      mode: 'chat',
      specView: 'edit',
      specContent: '',
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
    ws.init()
    await this.loadModels()
    await this.loadDefaultModel()
    await this.loadData()
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
        this.sessionId = ''
      }
    },
    async saveSpec() {
      if (!this.specFilePath) return
      try {
        await api.writeFile(this.specFilePath, this.specContent)
        this.$emit('save-spec', this.specContent)
        this.$emit('spec-updated')
        this.$message.success('方案已保存')
      } catch (e) {
        this.$message.error('保存失败')
      }
    },
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
          this.$emit('spec-updated')
          this.loadSpec()
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
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.isProcessing || !this.sessionId) return

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      const contextMsg = `先在 ${this.specFilePath} 生成方案，先不要修改代码。\n\n用户输入: ${content}`

      this.inputMessage = ''
      this.isProcessing = true
      this.logItems.push({ type: 'chat', content, _id: `log-${++this.logSeq}` })
      this.scrollToBottom()

      ws.send('chat', { message: contextMsg, sessionId: this.sessionId, modelName: this.modelName || undefined })
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
