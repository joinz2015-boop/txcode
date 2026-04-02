<template>
  <div class="step2-container">
    <div class="step2-main">
      <div class="editor-panel">
        <div class="editor-header">
          <i class="el-icon-document"></i>
          <span>{{ specFilePath }}</span>
        </div>
        <div class="editor-container" ref="editorContainer"></div>
      </div>
      <div class="chat-panel">
        <div class="panel-header">
          <span><i class="el-icon-chat-dot-round"></i> AI 方案助手</span>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="!logItems.length" class="empty-state">
            <i class="el-icon-chat-dot-round"></i>
            <p>输入需求描述，AI将协助您完善方案</p>
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
            placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
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
            <span v-if="sessionStatus === 'processing'" class="thinking-spinner"></span>
            {{ sessionStatus === 'processing' ? '思考中' : '✓ 就绪' }}
          </span>
          <span class="separator">|</span>
          <span class="model-selector" @click="openModelSelector" @mousedown.prevent>
            模型：{{ modelName || '-' }} ▾
          </span>
          <span class="separator">|</span>
          <span>会话：{{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
          <span class="separator">|</span>
          <span>token：{{ promptTokens || 0 }}</span>
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
import * as monaco from 'monaco-editor'
import ModelSelectDialog from './ModelSelectDialog.vue'
import CommandDialog from './CommandDialog.vue'
import FileSelectDialog from './FileSelectDialog.vue'

export default {
  name: 'Step2Design',
  components: { ModelSelectDialog, CommandDialog, FileSelectDialog },
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      editor: null,
      specContent: '',
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      logItems: [],
      modelName: '',
      modelSelectVisible: false,
      commandDialogVisible: false,
      fileSelectVisible: false,
      sessionId: '',
      sessionStatus: 'idle'
    }
  },
  computed: {
    specFilePath() {
      if (!this.category || !this.name) return '等待选择需求...'
      return `${this.reqBasePath}\\${this.category}\\${this.name}\\${this.name}_方案.md`
    }
  },
  watch: {
    category: { handler() { this.loadData() } },
    name: { handler() { this.loadData() } }
  },
  async mounted() {
    this.initMonacoEditor()
    await this.loadData()
    await this.loadDefaultModel()
    api.ws.init()
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
    }
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const textarea = e.target
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const value = this.inputMessage
          this.inputMessage = value.substring(0, start) + '\n' + value.substring(end)
          this.$nextTick(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1
          })
        } else {
          e.preventDefault()
          this.sendMessage()
        }
      }
    },
    async loadData() {
      await Promise.all([this.loadSpec(), this.loadSession()])
    },
    async loadSpec() {
      if (!this.category || !this.name) {
        this.specContent = '# 选择或创建需求项目开始设计\n'
        this.syncEditorContent(this.specContent)
        return
      }
      try {
        const specPath = this.specFilePath
        const res = await api.getFileContent(specPath)
        this.specContent = res.content || ''
        this.syncEditorContent(this.specContent)
      } catch (e) {
        console.error('Load spec failed:', e)
        this.specContent = ''
        this.syncEditorContent('')
      }
    },
    async loadSession() {
      if (!this.category || !this.name) {
        this.sessionId = ''
        return
      }
      try {
        const sessionFilePath = `${this.reqBasePath}\\${this.category}\\${this.name}\\session.json`
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
        } else {
          this.logItems = []
        }
      } catch (e) {
        console.error('Load session failed:', e)
        this.sessionId = ''
        this.logItems = []
      }
    },
    syncEditorContent(content) {
      if (!this.editor || content === undefined || content === null) return
      const next = String(content)
      if (this.editor.getValue() !== next) {
        this.editor.setValue(next)
      }
    },
    initMonacoEditor() {
      if (this.editor) return
      this.$nextTick(() => {
        this.createEditor()
      })
    },
    createEditor() {
      if (this.editor) return
      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: this.specContent || '# 选择或创建需求项目开始设计\n',
        language: 'markdown',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16 }
      })
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveSpec()
      })
      this.syncEditorContent(this.specContent)
    },
    saveSpec() {
      if (!this.editor) return
      const content = this.editor.getValue()
      this.$emit('save-spec', content)
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.disabled) return

      if (!this.sessionId) {
        this.$message.error('会话不存在，请刷新页面')
        return
      }

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      const contextMsg = `先在 ${this.specFilePath} 生成方案，先不要修改代码。\n\n用户输入: ${content}`

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.logItems.push({ type: 'chat', content: content })

      api.sessionWsSend(this.sessionId, 'chat', { message: contextMsg, sessionId: this.sessionId, modelName: this.modelName || undefined })
    },
    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      api.sessionWsSend(this.sessionId, 'stop', { sessionId: this.sessionId })
    },
    subscribeSession() {
      if (!this.sessionId) return
      
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
      }

      this.wsUnsubscribe = api.wsSubscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
        },
        todos: (data) => {
          if (data?.todos) this.logItems.push({ type: 'todos', todos: data.todos })
          this.scrollToBottom()
        },
        step: (data) => {
          this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
          if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollToBottom()
        },
        compact: (data) => {
          this.logItems.push({ type: 'system', content: `【压缩完成】${data.summary || ''}` })
          this.loadMessages()
        },
        done: (data) => {
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'completed'
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.$emit('spec-updated')
          this.scrollToBottom()
        },
        stopped: () => {
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.scrollToBottom()
        },
        error: (data) => {
          this.$message.error(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
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
.step2-container { height: 100%; display: flex; flex-direction: column; }
.step2-main { display: flex; flex: 1; gap: 16px; overflow: hidden; padding: 16px; }
.editor-panel { flex: 1; min-width: 300px; background: #121212; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.editor-header { background: #121212; border-bottom: 1px solid #1e1e1e; padding: 12px 16px; font-size: 13px; color: #84848a; display: flex; align-items: center; gap: 8px; }
.editor-container { flex: 1; min-height: 0; }
.chat-panel { width: 480px; background: #121212; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; flex-shrink: 0; }
.panel-header { background: #121212; border-bottom: 1px solid #1e1e1e; padding: 12px 16px; font-size: 14px; font-weight: 500; color: #f4f4f5; flex-shrink: 0; }
.chat-messages { flex: 1; overflow-y: auto; padding: 0 16px 16px; font-size: 14px; line-height: 1.6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #84848a; }
.empty-state i { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.todos-list { margin-bottom: 16px; color: #d4d4d8; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.user-question { color: #60a5fa; font-weight: bold; margin-bottom: 16px; }
.user-question :deep(p) { color: #d4d4d8; font-weight: normal; margin: 0 0 8px 0; }
.ai-thought { color: #d4d4d8; margin-bottom: 16px; }
.log-mute { color: #84848a; margin-bottom: 16px; white-space: pre; }
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }
.build-info { color: #84848a; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.chat-input-area { border-top: 1px solid #1e1e1e; padding: 12px 16px; background: #121212; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.input-area { width: 100%; }
.input-actions { display: flex; justify-content: flex-end; gap: 8px; }
.status-bar { display: flex; gap: 8px; align-items: center; padding: 6px 16px; font-size: 12px; color: #84848a; border-top: 1px solid #1e1e1e; flex-shrink: 0; flex-wrap: wrap; background: #0a0a09; }
.status-bar .separator { color: #3f3f46; }
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
.model-selector { cursor: pointer; }
.model-selector:hover { color: #60a5fa; }
</style>
