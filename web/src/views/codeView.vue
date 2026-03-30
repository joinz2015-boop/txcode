<template>
  <div class="code-view">
    <SessionsPanel
      v-if="sidebarVisible"
      :sessions="displayedSessions"
      :current-session-id="currentSession?.id"
      :has-more="hasMore"
      :loading-more="loadingMore"
      @create="createSession"
      @select="selectSession"
      @command="handleSessionCommand"
      @dragstart="onDragStart"
      @loadmore="loadMore"
    />

    <div class="terminal-container" :class="'layout-' + layoutMode">
      <div
        v-for="(panel, index) in activeSessions"
        :key="index"
        class="session-panel"
        :class="{ 'panel-active': focusedPanelIndex === index }"
        @click="focusedPanelIndex = index"
        @dragover.prevent
        @drop="onDropPanel($event, index)"
      >
        <div class="panel-header">
          <span class="title"># {{ panel.session?.id ? (panel.userQuestion || '新会话') : '选择会话' }}</span>
        </div>
        <div class="log-area">
          <template v-if="panel.session?.id">
            <template v-for="(item, idx) in panel.logItems" :key="item._id || idx">
              <div v-if="item.type === 'todos'" class="todos-list">
                <div v-for="(todo, tIdx) in item.todos" :key="`${item._id || idx}-todo-${tIdx}`" class="todo-item">
                  <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                  <span class="todo-name">{{ todo.name }}</span>
                </div>
              </div>
              <div v-else-if="item.type === 'chat'" class="flex justify-end">
                <div  class="user-question">{{ item.content }}</div>
              </div>
              <p v-else-if="item.type === 'think'"  v-html="item.renderedContent || renderMarkdown(item.content)"></p>
              <template v-else-if="item.type === 'step'">
                <p v-if="item.thought" v-html="item.renderedThought || renderMarkdown(item.thought)"></p>
                <div v-for="(tc, aIdx) in item.toolCalls" :key="`${item._id || idx}-tool-${aIdx}`" class="log-mute">
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                    {{ item.success !== false ? '✓' : '✗' }}
                  </span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </div>
              </template>
            </template>
            <div v-if="panel.logItems.length === 0" class="empty-state">
              <span>开始对话吧！输入您的问题...</span>
            </div>
            <div class="build-info" v-if="panel.modelName">
              <span class="icon">▣</span> Build · {{ panel.modelName }}
            </div>
          </template>
          <div v-else class="empty-state">
            <span>拖拽会话到此处或点击选择</span>
          </div>
        </div>
        <div class="input-block">
          <el-input
            v-model="panel.input"
            type="textarea"
            :rows="2"
            placeholder="输入消息... (Enter 发送, @ 选择文件)"
            :disabled="panel.disabled || !panel.session?.id"
            class="input-area"
            @input="onInputChange($event, panel)"
            @keydown.enter.native="handleKeydown($event, panel)"
            @keydown.esc.native="cancelFileSelect"
          />
          <el-button v-if="panel.disabled && !panel.stopping" type="danger" @click.stop="stopPanel(panel)" class="stop-btn">
            ■ 停止
          </el-button>
          <el-button v-else-if="panel.stopping" type="info" disabled class="stop-btn">
            停止中...
          </el-button>
          <el-button v-else type="primary" :disabled="!panel.session?.id" @click.stop="sendToPanel(panel)" class="send-btn">
            发送
          </el-button>
        </div>
        <div class="status-bar">
          <span v-if="panel.disabled && !panel.stopping" class="status-thinking">
            <span class="thinking-spinner" aria-hidden="true"></span> 思考中
          </span>
          <span v-else class="status-ready">✓ 就绪</span>
          <span class="separator">|</span>
          <span class="model-selector" @click.stop="openModelSelector(panel)">
            模型：{{ panel.modelName || '-' }} ▾
          </span>
          <span class="separator">|</span>
          <span>会话：{{ panel.session?.id ? panel.session.id.slice(0, 8) : '--------' }}</span>
          <span class="separator">|</span>
          <span>token：(<span :class="panel.promptTokens > 50000 ? 'token-warning' : ''">{{ panel.promptTokens || 0 }}{{ panel.promptTokens > 50000 ? ' 会话太大推荐用/compact压缩会话' : '' }}</span>)</span>
          <span class="separator">|</span>
          <span class="status-action" @click.stop="openCommandDialog">命令</span>
          <span class="separator">|</span>
          <span class="status-action" @click.stop="openFileSelectFromStatus">选择文件</span>
        </div>
      </div>
    </div>

    <div class="layout-switcher">
      <el-button-group>
        <el-button :type="layoutMode === 1 ? 'primary' : ''" @click="setLayout(1)">1</el-button>
        <el-button :type="layoutMode === 2 ? 'primary' : ''" @click="setLayout(2)">2</el-button>
        <el-button :type="layoutMode === 4 ? 'primary' : ''" @click="setLayout(4)">4</el-button>
      </el-button-group>
    </div>

    <FileSelectDialog
      :visible.sync="fileSelectVisible"
      @select="onFileSelected"
      @close="cancelFileSelect"
    />

    <ModelSelectDialog
      :visible.sync="modelSelectVisible"
      :current-model="selectedPanel?.modelName"
      @select="onModelSelected"
      @close="modelSelectVisible = false"
    />

    <CommandDialog
      :visible.sync="commandDialogVisible"
      @execute="handleExecuteCommand"
      @close="commandDialogVisible = false"
    />
  </div>
</template>

<script>
import { api } from '../api'
import { marked } from 'marked'
import SessionsPanel from '../components/SessionsPanel.vue'
import FileSelectDialog from '../components/FileSelectDialog.vue'
import ModelSelectDialog from '../components/ModelSelectDialog.vue'
import CommandDialog from '../components/CommandDialog.vue'

export default {
  name: 'CodeView',
  components: { SessionsPanel, FileSelectDialog, ModelSelectDialog, CommandDialog },
  MAX_LOG_ITEMS: 400,

  props: {
    sidebarVisible: { type: Boolean, default: true }
  },

  data() {
    return {
      layoutMode: 1,
      focusedPanelIndex: 0,
      sessions: [],
      displayedSessions: [],
      currentSession: null,
      activeSessions: [],
      page: 1,
      pageSize: 10,
      hasMore: false,
      loadingMore: false,
      draggedSession: null,
      fileSelectVisible: false,
      currentPanel: null,
      modelSelectVisible: false,
      selectedPanel: null,
      commandDialogVisible: false,
      scrollRafMap: new WeakMap(),
      logSeq: 0
    }
  },

  watch: {
    '$route.params.id': {
      immediate: true,
      handler(id) {
        if (id) {
          const session = this.sessions.find(s => s.id === id)
          if (session) {
            this.currentSession = session
            this.updateActiveSessions()
          }
        }
      }
    }
  },

  created() {
    this.loadSessions()
  },

  activated() {
    this.activeSessions.forEach(panel => {
      if (panel.session?.id && !panel.wsConnected) {
        this.initPanelWs(panel, panel.session.id)
      }
    })
  },

  deactivated() {
  },

  methods: {
    onInputChange(value, panel) {
      const atIndex = value.lastIndexOf('@')
      if (atIndex !== -1) {
        const afterAt = value.slice(atIndex + 1)
        if (!afterAt.includes(' ') && !this.fileSelectVisible) {
          this.currentPanel = panel
          this.fileSelectVisible = true
        }
      }
    },

    onFileSelected(filePath) {
      const panel = this.currentPanel
      if (!panel) return
      const atIndex = panel.input.lastIndexOf('@')
      panel.input = panel.input.slice(0, atIndex) + filePath + ' '
      this.cancelFileSelect()
    },

    cancelFileSelect() {
      this.fileSelectVisible = false
      this.currentPanel = null
    },

    openModelSelector(panel) {
      this.selectedPanel = panel
      this.modelSelectVisible = true
    },

    onModelSelected(model) {
      if (this.selectedPanel) {
        const parts = model.name.split('/')
        const modelName = parts.length > 2 ? parts.slice(1).join('/') : model.name
        this.selectedPanel.modelName = modelName
        api.setConfig('defaultModel', modelName)
      }
    },

    openCommandDialog() {
      this.commandDialogVisible = true
    },

    openFileSelectFromStatus() {
      this.currentPanel = this.activeSessions[this.focusedPanelIndex]
      this.fileSelectVisible = true
    },

    async handleExecuteCommand(cmd) {
      const panel = this.activeSessions[this.focusedPanelIndex]
      if (!panel) {
        this.$message.warning('请先选择面板')
        return
      }
      panel.input = cmd + ' '
      this.$nextTick(() => {
        const textarea = panel.$el?.querySelector('.input-area textarea')
        if (textarea) {
          textarea.focus()
        }
      })
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

    getToolCallName(toolCall) {
      return toolCall?.function?.name || 'unknown_tool'
    },

    getToolCallArguments(toolCall) {
      return toolCall?.function?.arguments || ''
    },

    renderMarkdown(text) {
      return text ? marked(text) : ''
    },

    createThinkItem(content) {
      return {
        type: 'think',
        content,
        renderedContent: this.renderMarkdown(content)
      }
    },

    createStepItem(data) {
      const thought = data?.thought || ''
      return {
        type: 'step',
        thought,
        renderedThought: this.renderMarkdown(thought),
        toolCalls: Array.isArray(data?.toolCalls) ? data.toolCalls.filter(Boolean) : [],
        success: data?.success
      }
    },

    withLogId(item) {
      if (!item || typeof item !== 'object') return { type: 'system', content: String(item), _id: `log-${++this.logSeq}` }
      if (item._id) return item
      return { ...item, _id: `log-${++this.logSeq}` }
    },

    pushLogItem(panel, item) {
      panel.logItems.push(this.withLogId(item))
      const maxLogItems = this.$options.MAX_LOG_ITEMS || 400
      if (panel.logItems.length > maxLogItems) {
        panel.logItems.splice(0, panel.logItems.length - maxLogItems)
      }
    },

    stopThinking(panel) {
      panel.disabled = false
      panel.stopping = false
      clearInterval(panel.dotInterval)
      panel.dotInterval = null
    },

    schedulePanelScroll(panel) {
      if (this.scrollRafMap.get(panel)) return
      const rafId = requestAnimationFrame(() => {
        this.scrollRafMap.delete(panel)
        const panelIdx = this.activeSessions.indexOf(panel)
        if (panelIdx > -1) {
          const el = this.$el?.querySelectorAll('.session-panel')?.[panelIdx]
          const logArea = el?.querySelector('.log-area')
          if (logArea) logArea.scrollTop = logArea.scrollHeight
        }
      })
      this.scrollRafMap.set(panel, rafId)
    },

    initPanelWs(panel) {
      if (!panel.session?.id || panel.wsConnected) return
      api.sessionWsConnect(
        panel.session.id,
        (msg) => this.handlePanelWsMessage(panel, msg),
        () => { panel.wsConnected = true },
        () => {
          panel.wsConnected = false
          setTimeout(() => {
            if (!api.sessionWsIsConnected(panel.session.id)) this.initPanelWs(panel)
          }, 3000)
        },
        (err) => { panel.wsConnected = false; console.error(err) }
      )
    },

    handlePanelWsMessage(panel, msg) {
      const { type, data, error } = msg
      switch (type) {
        case 'todos':
          if (data?.todos) this.pushLogItem(panel, { type: 'todos', todos: data.todos })
          break
        case 'session':
          if (data?.sessionId && !panel.session.id) panel.session.id = data.sessionId
          break
        case 'step':
          if (data) this.pushLogItem(panel, this.createStepItem(data))
          break
        case 'compact':
          this.pushLogItem(panel, { type: 'system', content: `【压缩完成】${data.summary || ''}` })
          this.loadSessions()
          if (panel.session?.id) this.loadMessagesForPanel(panel, panel.session.id)
          break
        case 'done':
          this.stopThinking(panel)
          if (data?.modelName) panel.modelName = data.modelName
          if (data?.usage?.promptTokens) panel.promptTokens = data.usage.promptTokens
          if (data?.response) this.pushLogItem(panel, this.createThinkItem(data.response))
          if (data?.sessionId) this.loadSessions()
          break
        case 'stopped':
          this.stopThinking(panel)
          this.pushLogItem(panel, this.createThinkItem('【已停止】'))
          break
        case 'error':
          this.$message.error(error || '发生错误')
          this.stopThinking(panel)
          break
      }
      this.$nextTick(() => this.schedulePanelScroll(panel))
    },

    setLayout(mode) {
      this.layoutMode = mode
      this.updateActiveSessions()
    },

    updateActiveSessions() {
      const count = this.layoutMode
      const newActive = []
      for (let i = 0; i < count; i++) {
        newActive.push(this.activeSessions[i] || {
          session: null, logItems: [], userQuestion: '', modelName: '',
          input: '', disabled: false, stopping: false, wsConnected: false,
          promptTokens: 0, dotInterval: null, compactionRatio: 0
        })
      }
      this.activeSessions = newActive
    },

    onDragStart(event, session) {
      this.draggedSession = session
      event.dataTransfer.effectAllowed = 'move'
    },

    onDropPanel(event, index) {
      if (!this.draggedSession) return
      const panel = this.activeSessions[index]
      panel.session = this.draggedSession
      panel.logItems = []
      panel.userQuestion = ''
      panel.disabled = false
      panel.stopping = false
      panel.wsConnected = false
      panel.promptTokens = 0
      clearInterval(panel.dotInterval)
      panel.dotInterval = null
      this.loadMessagesForPanel(panel, this.draggedSession.id)
      this.initPanelWs(panel)
      this.draggedSession = null
    },

    bindSessionToPanel(session, panelIndex = null) {
      const idx = panelIndex !== null ? panelIndex : this.focusedPanelIndex
      if (idx >= 0 && idx < this.activeSessions.length) {
        const panel = this.activeSessions[idx]
        Object.assign(panel, {
          session, logItems: [], userQuestion: '', disabled: false,
          stopping: false, wsConnected: false, promptTokens: 0, dotInterval: null, compactionRatio: 0
        })
        this.loadMessagesForPanel(panel, session.id)
        this.initPanelWs(panel)
      }
    },

    async loadMessagesForPanel(panel, sessionId) {
      try {
        const res = await api.getMessages(sessionId)
        panel.logItems = (res.data || []).map(item => {
          if (item.type === 'think') return this.withLogId(this.createThinkItem(item.content || ''))
          if (item.type === 'step') return this.withLogId(this.createStepItem(item))
          return this.withLogId(item)
        })
        const userItem = panel.logItems.find(item => item.type === 'chat' || item.type === 'think')
        if (userItem) panel.userQuestion = userItem.content
      } catch (e) {
        panel.logItems = []
      }
    },

    async loadSessions() {
      try {
        const res = await api.getSessions()
        this.sessions = res.data || []
        this.page = 1
        this.displayedSessions = this.sessions.slice(0, this.pageSize)
        this.hasMore = this.sessions.length > this.pageSize
        this.updateActiveSessions()
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    },

    handleKeydown(e, panel) {
      if (e.shiftKey) return
      e.preventDefault()
      this.sendToPanel(panel)
    },

    loadMore() {
      this.loadingMore = true
      this.page++
      const nextSessions = this.sessions.slice(0, this.page * this.pageSize)
      this.displayedSessions = nextSessions
      this.hasMore = this.sessions.length > nextSessions.length
      this.loadingMore = false
    },

    async createSession() {
      try {
        const res = await api.createSession('新会话')
        this.sessions.unshift(res.data)
        this.page = 1
        this.displayedSessions = this.sessions.slice(0, this.pageSize)
        this.hasMore = this.sessions.length > this.pageSize
        this.bindSessionToPanel(res.data)
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message)
      }
    },

    selectSession(session) {
      this.currentSession = session
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'codeView-session', params: { id: session.id } }).catch(() => {})
      }
      this.bindSessionToPanel(session)
      this.loadDefaultModel(session)
    },

    async loadDefaultModel(session) {
      try {
        const configRes = await api.getConfig('defaultModel')
        if (configRes.data?.value) {
          const panel = this.activeSessions[this.focusedPanelIndex]
          if (panel && panel.session?.id === session.id) {
            panel.modelName = configRes.data.value
          }
        }
      } catch (e) {
        console.error('加载默认模型失败:', e)
      }
    },

    async sendToPanel(panel) {
      const content = panel.input.trim()
      if (!content || panel.disabled) return

      panel.input = ''
      panel.disabled = true
      panel.stopping = false
      panel.userQuestion = content
      this.pushLogItem(panel, { type: 'chat', content: content })

      if (api.sessionWsIsConnected(panel.session.id)) {
        api.sessionWsSend(panel.session.id, 'chat', { message: content, sessionId: panel.session?.id, modelName: panel.modelName || undefined })
      } else {
        this.initPanelWs(panel)
        setTimeout(() => {
          if (api.sessionWsIsConnected(panel.session.id)) {
            api.sessionWsSend(panel.session.id, 'chat', { message: content, sessionId: panel.session?.id, modelName: panel.modelName || undefined })
          }
        }, 500)
      }
    },

    stopPanel(panel) {
      if (!panel.session?.id || panel.stopping) return
      panel.stopping = true
      api.sessionWsSend(panel.session.id, 'stop', { sessionId: panel.session.id })
    },

    async handleSessionCommand(cmd, session) {
      if (cmd === 'rename') {
        this.$prompt('请输入新名称', '重命名会话', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: session.title || '新会话',
          inputPattern: /.+/,
          inputErrorMessage: '名称不能为空'
        }).then(async ({ value }) => {
          try {
            await api.updateSession(session.id, { title: value })
            session.title = value
            if (this.currentSession?.id === session.id) this.currentSession.title = value
            this.$message.success('重命名成功')
          } catch (e) {
            this.$message.error('重命名失败: ' + e.message)
          }
        }).catch(() => {})
      } else if (cmd === 'delete') {
        this.$confirm('确定要删除该会话吗？此操作会同时删除会话中的所有消息。', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          try {
            await api.deleteSession(session.id)
            const idx = this.sessions.findIndex(s => s.id === session.id)
            if (idx > -1) this.sessions.splice(idx, 1)
            const displayIdx = this.displayedSessions.findIndex(s => s.id === session.id)
            if (displayIdx > -1) this.displayedSessions.splice(displayIdx, 1)
            if (this.currentSession?.id === session.id) {
              this.currentSession = this.displayedSessions.length > 0 ? this.displayedSessions[0] : null
            }
            this.$message.success('删除成功')
          } catch (e) {
            this.$message.error('删除失败: ' + e.message)
          }
        }).catch(() => {})
      }
    }
  }
}
</script>

<style scoped>
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #52525b; }

.code-view {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #0a0a09;
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace;
}

.terminal-container {
  flex: 1;
  display: grid;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.terminal-container.layout-1 { grid-template-columns: 1fr; }
.terminal-container.layout-2 { grid-template-columns: 1fr 1fr; }
.terminal-container.layout-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

.session-panel {
  display: flex;
  flex-direction: column;
  background-color: #0a0a09;
  border: 1px solid #1e1e1e;
  overflow: hidden;
  min-height: 0;
  cursor: pointer;
  transition: border-color 0.2s;
}

.session-panel:hover { border-color: #3b82f6; }
.session-panel.panel-active { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }

.panel-header {
  display: flex;
  justify-content: space-between;
  background-color: #121212;
  padding: 12px 16px;
  border-bottom: 1px solid #27272a;
  font-weight: bold;
  flex-shrink: 0;
}

.panel-header .title { color: #f4f4f5; }

.log-area {
  flex: 1;
  padding: 0 60px 50px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.log-area p { margin: 0 0 16px 0; color: #d4d4d8; }
.user-question {
  color: #60a5fa;
  font-weight: bold;
  border: 1px solid #60a5fa;
  padding: 15px;
  margin:15px;
  border-radius: 10px;
  display: inline-block;
  max-width: 60%;
}
.todos-list { margin-bottom: 16px; color: #d4d4d8; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.todo-status, .todo-name { font-size: 14px; }
.log-mute { color: #84848a; margin-bottom: 16px; white-space: pre; }
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }

.build-info { color: #84848a; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.build-info .icon { color: #60a5fa; font-size: 12px; }

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #84848a;
}

.input-block {
  background-color: #18191b;
  padding: 12px 16px;
  border-top: 1px solid #27272a;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-shrink: 0;
}

.input-area { flex: 1; }
.send-btn, .stop-btn { height: auto; }

.status-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 16px;
  font-size: 12px;
  color: #84848a;
  border-top: 1px solid #27272a;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.status-bar .separator { color: #3f3f46; }
.status-ready { color: #22c55e; }
.status-thinking { color: #60a5fa; }
.token-warning { color: #ef4444; }
.thinking-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #3f3f46;
  border-top-color: #60a5fa;
  border-radius: 50%;
  display: inline-block;
  vertical-align: -1px;
  margin-right: 6px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.layout-switcher { position: fixed; right: 20px; bottom: 20px; z-index: 100; }
.model-selector { cursor: pointer; }
.model-selector:hover { color: #60a5fa; }
.status-action { cursor: pointer; }
.status-action:hover { color: #60a5fa; }
</style>
