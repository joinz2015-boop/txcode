<template>
  <div class="step4-container">
    <div class="step4-main">
      <div class="code-chat-panel">
        <div class="panel-header">
          <span><i class="el-icon-s-check"></i> 测试验收对话</span>
          <el-button type="primary" size="small" @click="insertTestCommand" :disabled="disabled">
            <i class="el-icon-s-claim"></i> 根据方案测试
          </el-button>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="!logItems.length" class="empty-state">
            <i class="el-icon-chat-dot-round"></i>
            <p>点击上方按钮或输入测试要求进行验收</p>
          </div>
          <template v-for="(item, idx) in logItems" :key="idx">
            <div v-if="item.type === 'todos'" class="todos-list">
              <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
                <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                <span class="todo-name">{{ todo.name }}</span>
              </div>
            </div>
            <div v-else-if="item.type === 'chat' || item.type === 'think'" class="user-question" v-html="renderMarkdown(item.content)"></div>
            <div v-else-if="item.type === 'system'" class="system-message" v-html="renderMarkdown(item.content)"></div>
            <template v-else-if="item.type === 'step'">
              <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
              <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
                <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                  {{ item.success !== false ? '✓' : '✗' }}
                </span>
                {{ tc.function.name }}
                <span v-if="tc.function.arguments" class="tool-input">{{ formatInput(tc.function.name, tc.function.arguments) }}</span>
              </div>
            </template>
          </template>
          <div class="build-info" v-if="modelName">
            <span class="icon">▣</span> Build · {{ modelName }}
          </div>
        </div>
        <div class="chat-input-area">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="3"
            placeholder="输入测试要求... (Enter 发送, @ 选择文件)"
            :disabled="disabled && !stopping"
            class="input-area"
            @keydown.enter.native="handleKeydown"
          ></el-input>
          <div class="input-actions">
            <el-button v-if="disabled && !stopping" type="danger" @click="stopChat" class="stop-btn">
              ■ 停止
            </el-button>
            <el-button v-else-if="stopping" type="info" disabled class="stop-btn">
              停止中...
            </el-button>
            <el-button v-else type="primary" :disabled="!inputMessage.trim()" @click="sendMessage" class="send-btn">
              发送
            </el-button>
          </div>
        </div>
        <div class="status-bar">
          <span :class="sessionStatus === 'processing' ? 'status-thinking' : 'status-ready'">
            {{ sessionStatus === 'processing' ? dotAnimation + ' 思考中' : '✓ 就绪' }}
          </span>
          <span class="separator">|</span>
          <span class="model-selector" @click="openModelSelector" @mousedown.prevent>
            模型：{{ modelName || '-' }} ▾
          </span>
          <span class="separator">|</span>
          <span>会话：{{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
          <span class="separator">|</span>
          <span>token：(<span :class="promptTokens > 50000 ? 'token-warning' : ''">{{ promptTokens || 0 }}{{ promptTokens > 50000 && !compactionRatio ? ' 会话太大推荐用/compact压缩会话' : '' }}</span>)</span>
          <span v-if="compactionRatio" class="compaction-info">{{ compactionRatio }}%压缩</span>
          <span class="separator">|</span>
          <span class="status-action" @click="openCommandDialog" @mousedown.prevent>命令</span>
          <span class="separator">|</span>
          <span class="status-action" @click="openFileSelect" @mousedown.prevent>选择文件</span>
        </div>
      </div>
    </div>

    <ModelSelectDialog
      :visible.sync="modelSelectVisible"
      :current-model="modelName"
      @select="onModelSelected"
    />

    <CommandDialog
      :visible.sync="commandDialogVisible"
      @execute="handleExecuteCommand"
    />

    <FileSelectDialog
      :visible.sync="fileSelectVisible"
      @select="onFileSelected"
      @close="cancelFileSelect"
    />
  </div>
</template>

<script>
import { api } from '../api'
import { marked } from 'marked'
import ModelSelectDialog from './ModelSelectDialog.vue'
import CommandDialog from './CommandDialog.vue'
import FileSelectDialog from './FileSelectDialog.vue'

export default {
  name: 'Step4Test',
  components: { ModelSelectDialog, CommandDialog, FileSelectDialog },
  props: {
    projectKey: {
      type: String,
      default: ''
    },
    sessionId: {
      type: String,
      default: ''
    },
    reqBasePath: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      compactionRatio: 0,
      dotAnimation: '',
      dotInterval: null,
      dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'],
      logItems: [],
      modelName: '',
      modelSelectVisible: false,
      commandDialogVisible: false,
      fileSelectVisible: false,
      wsUnsubscribe: null,
      sessionStatus: 'idle'
    }
  },
  computed: {
    projectName() {
      if (!this.projectKey) return ''
      const parts = this.projectKey.split('/')
      return parts[parts.length - 1] || ''
    },
    specFilePath() {
      if (!this.projectKey) return ''
      return `${this.reqBasePath}\\${this.projectKey}\\${this.projectName}_方案.md`
    }
  },
  watch: {
    sessionId: {
      immediate: true,
      handler(val) {
        if (val) {
          this.subscribeSession()
          this.loadMessages()
        }
      }
    }
  },
  mounted() {
    this.loadDefaultModel()
    api.ws.init()
  },
  beforeDestroy() {
    if (this.dotInterval) {
      clearInterval(this.dotInterval)
    }
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
      this.wsUnsubscribe = null
    }
  },
  methods: {
    handleKeydown(e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.sendMessage()
    },
    insertTestCommand() {
      if (this.projectKey) {
        this.inputMessage = `根据 ${this.specFilePath} 方案测试相应功能是否实现。`
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.disabled) return

      let activeSessionId = this.sessionId
      if (!activeSessionId) {
        try {
          const created = await api.createSession(`[测试验收] ${this.projectKey}`)
          activeSessionId = created.data?.id || ''
          if (!activeSessionId) {
            this.$message.error('创建测试会话失败')
            return
          }
          this.$emit('update:sessionId', activeSessionId)
        } catch (e) {
          console.error('Create test session failed:', e)
          this.$message.error('创建测试会话失败')
          return
        }
      }

      const specPath = this.specFilePath
      const contextMsg = this.projectKey
        ? `先参考方案文件 ${specPath} 进行功能测试验收。\n\n用户输入: ${content}`
        : content

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.logItems.push({ type: 'chat', content: content })

      let dotIdx = 0
      this.dotAnimation = this.dots[dotIdx]
      this.dotInterval = setInterval(() => {
        dotIdx = (dotIdx + 1) % this.dots.length
        this.dotAnimation = this.dots[dotIdx]
      }, 150)

      api.ws.send(activeSessionId, 'chat', { message: contextMsg, sessionId: activeSessionId, modelName: this.modelName || undefined })
    },
    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      api.ws.send(this.sessionId, 'stop', { sessionId: this.sessionId })
    },
    subscribeSession() {
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
      }
      if (!this.sessionId) return
      this.wsUnsubscribe = api.ws.subscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
        },
        todos: (data) => {
          if (data?.todos) this.logItems.push({ type: 'todos', todos: data.todos })
        },
        session: (data) => {
          if (data?.sessionId && !this.sessionId) {
            this.$emit('update:sessionId', data.sessionId)
          }
        },
        step: (data) => {
          if (data) {
            this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
            if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
            this.scrollToBottom()
          }
        },
        compact: (data) => {
          this.logItems.push({ type: 'system', content: `【压缩完成】${data.summary || ''}` })
          this.loadMessages()
        },
        done: (data) => {
          this.disabled = false
          this.stopping = false
          this.dotAnimation = ''
          clearInterval(this.dotInterval)
          this.dotInterval = null
          this.sessionStatus = 'completed'
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.scrollToBottom()
        },
        stopped: () => {
          this.disabled = false
          this.stopping = false
          this.dotAnimation = ''
          clearInterval(this.dotInterval)
          this.dotInterval = null
          this.sessionStatus = 'idle'
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.scrollToBottom()
        },
        error: (data) => {
          this.$message.error(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.dotAnimation = ''
          clearInterval(this.dotInterval)
          this.dotInterval = null
          this.sessionStatus = 'idle'
        }
      })
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        this.logItems = res.data || []
      } catch (e) {
        console.error('Load messages failed:', e)
      }
    },
    async loadDefaultModel() {
      try {
        const configRes = await api.getConfig('defaultModel')
        if (configRes.data?.value) {
          this.modelName = configRes.data.value
        }
      } catch (e) {
        console.error('Load default model failed:', e)
      }
    },
    openModelSelector() {
      this.modelSelectVisible = true
    },
    onModelSelected(model) {
      const parts = model.name.split('/')
      this.modelName = parts.length > 2 ? parts.slice(1).join('/') : model.name
      api.setConfig('defaultModel', this.modelName)
    },
    openCommandDialog() {
      this.commandDialogVisible = true
    },
    handleExecuteCommand(cmd) {
      this.inputMessage = cmd + ' '
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.input-area textarea')
        if (textarea) {
          textarea.focus()
        }
      })
    },
    openFileSelect() {
      this.fileSelectVisible = true
    },
    onFileSelected(filePath) {
      const atIndex = this.inputMessage.lastIndexOf('@')
      if (atIndex !== -1) {
        this.inputMessage = this.inputMessage.slice(0, atIndex) + filePath + ' '
      } else {
        this.inputMessage += filePath + ' '
      }
      this.cancelFileSelect()
    },
    cancelFileSelect() {
      this.fileSelectVisible = false
    },
    getTodoStatusIcon(status) {
      const icons = { completed: '✅', in_progress: '🔄', pending: '⬜', cancelled: '❌' }
      return icons[status] || '⬜'
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
        if (action === 'edit_file' || action === 'write_file') {
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
      return text ? marked(text) : ''
    }
  }
}
</script>

<style scoped>
.step4-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.step4-main {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.code-chat-panel {
  height: 100%;
  background: #121212;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  background: #121212;
  border-bottom: 1px solid #1e1e1e;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  font-size: 14px;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #84848a;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.todos-list { margin-bottom: 16px; color: #d4d4d8; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.todo-status, .todo-name { font-size: 14px; }
.user-question { color: #60a5fa; font-weight: bold; margin-bottom: 16px; }
.user-question :deep(p) { color: #d4d4d8; font-weight: normal; margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; }
.user-question :deep(strong) { color: #fff; }
.user-question :deep(code) { background: #27272a; padding: 2px 6px; border-radius: 4px; color: #60a5fa; font-size: 13px; }
.user-question :deep(pre) { background: #1e1e1e; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; font-size: 13px; }
.user-question :deep(ul), .user-question :deep(ol) { margin: 8px 0; padding-left: 20px; color: #d4d4d8; }
.user-question :deep(li) { margin: 4px 0; color: #d4d4d8; }
.user-question :deep(h1), .user-question :deep(h2), .user-question :deep(h3) { color: #fff; margin: 12px 0 8px 0; }
.user-question :deep(h1) { font-size: 20px; }
.user-question :deep(h2) { font-size: 18px; }
.user-question :deep(h3) { font-size: 16px; }
.user-question :deep(table) { border-collapse: collapse; margin: 8px 0; width: 100%; }
.user-question :deep(th), .user-question :deep(td) { border: 1px solid #3f3f46; padding: 6px 10px; color: #d4d4d8; }
.user-question :deep(th) { background: #1e1e1e; color: #fff; }
.user-question :deep(blockquote) { border-left: 3px solid #409EFF; padding-left: 12px; margin: 8px 0; color: #a1a1aa; }
.user-question :deep(hr) { border: none; border-top: 1px solid #3f3f46; margin: 12px 0; }
.ai-thought { color: #d4d4d8; margin-bottom: 16px; font-size: 14px; line-height: 1.6; }
.ai-thought :deep(p) { margin: 0 0 8px 0; }
.ai-thought :deep(strong) { color: #fff; }
.ai-thought :deep(code) { background: #27272a; padding: 2px 6px; border-radius: 4px; color: #60a5fa; font-size: 13px; }
.ai-thought :deep(pre) { background: #1e1e1e; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
.ai-thought :deep(ul), .ai-thought :deep(ol) { margin: 8px 0; padding-left: 20px; }
.ai-thought :deep(li) { margin: 4px 0; }
.ai-thought :deep(h1), .ai-thought :deep(h2), .ai-thought :deep(h3) { color: #fff; margin: 12px 0 8px 0; }
.ai-thought :deep(table) { border-collapse: collapse; margin: 8px 0; width: 100%; }
.ai-thought :deep(th), .ai-thought :deep(td) { border: 1px solid #3f3f46; padding: 6px 10px; }
.ai-thought :deep(th) { background: #1e1e1e; }
.ai-thought :deep(blockquote) { border-left: 3px solid #409EFF; padding-left: 12px; margin: 8px 0; color: #a1a1aa; }
.log-mute { color: #84848a; margin-bottom: 16px; white-space: pre; }
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }
.build-info { color: #84848a; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.build-info .icon { color: #60a5fa; font-size: 12px; }

.chat-input-area {
  border-top: 1px solid #1e1e1e;
  padding: 12px 16px;
  background: #121212;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.input-area { width: 100%; }
.input-actions { display: flex; justify-content: flex-end; gap: 8px; }
.send-btn, .stop-btn { height: auto; }

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

.status-bar .separator { color: #3f3f46; }
.status-ready { color: #22c55e; }
.status-thinking { color: #60a5fa; }
.token-warning { color: #ef4444; }
.compaction-info { color: #22c55e; margin-left: 8px; }
.model-selector { cursor: pointer; }
.model-selector:hover { color: #60a5fa; }
.status-action { cursor: pointer; }
.status-action:hover { color: #60a5fa; }
.system-message { color: #a78bfa; font-size: 13px; margin-bottom: 16px; padding: 8px 12px; background: #1e1e1e; border-radius: 6px; }
</style>