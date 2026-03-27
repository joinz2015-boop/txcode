<template>
  <div class="code-view">
    <aside v-if="sidebarVisible" class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">会话列表</div>
        <el-button type="primary" size="small" @click="createSession" class="new-btn">
          + 新建
        </el-button>
      </div>
      <div class="sidebar-content">
        <div
          v-for="session in displayedSessions"
          :key="session.id"
          class="session-item"
          :class="currentSession?.id === session.id ? 'active' : ''"
          draggable="true"
          @dragstart="onDragStart($event, session)"
          @click="selectSession(session)"
        >
          <div class="session-row">
            <span class="session-title truncate">{{ session.title || '新会话' }}</span>
            <span class="session-time">{{ formatTime(session.createdAt) }}</span>
            <div class="session-actions" @click.stop>
              <el-dropdown trigger="click" @command="(cmd) => handleSessionCommand(cmd, session)">
                <span class="action-btn">⋮</span>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item command="rename">重命名</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </div>
        </div>
        <div v-if="hasMore" class="load-more" @click="loadMore">
          <el-button size="small" :loading="loadingMore">加载更多</el-button>
        </div>
      </div>
    </aside>

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
            <template v-for="(item, idx) in panel.logItems" :key="idx">
              <div v-if="item.type === 'todos'" class="todos-list">
                <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
                  <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                  <span class="todo-name">{{ todo.name }}</span>
                </div>
              </div>
              <p v-else-if="item.type === 'chat' || item.type === 'think'" class="user-question" v-html="renderMarkdown(item.content)"></p>
              <template v-else-if="item.type === 'step'">
                <p v-if="item.thought" v-html="renderMarkdown(item.thought)"></p>
                <div v-for="(action, aIdx) in item.actions" :key="aIdx" class="log-mute">
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                    {{ item.success !== false ? '✓' : '✗' }}
                  </span>
                  {{ action.actionName }}
                  <span v-if="action.input" class="tool-input">{{ formatInput(action.actionName, action.input) }}</span>
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
            @keydown.native="fileSelectVisible ? onFileSelectKeydown($event, panel) : null"
            @keydown.enter.native="fileSelectVisible ? confirmFileSelect(panel) : handleKeydown($event, panel)"
            @keydown.esc.native="fileSelectVisible ? cancelFileSelect() : null"
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
          <span :class="panel.disabled && !panel.stopping ? 'status-thinking' : 'status-ready'">
            {{ panel.disabled && !panel.stopping ? panel.dotAnimation + ' 思考中' : '✓ 就绪' }}
          </span>
          <span class="separator">|</span>
          <span>模型：{{ panel.modelName || '-' }}</span>
          <span class="separator">|</span>
          <span>会话：{{ panel.session?.id ? panel.session.id.slice(0, 8) : '--------' }}</span>
          <span class="separator">|</span>
          <span>token：(<span :class="panel.promptTokens > 50000 ? 'token-warning' : ''">{{ panel.promptTokens || 0 }}{{ panel.promptTokens > 50000 ? ' 会话太大推荐用/compact压缩会话' : '' }}</span>)</span>
          <span class="separator">|</span>
          <span>帮助 /help</span>
          <span class="separator">|</span>
          <span>退出 ctrl+c</span>
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

    <el-dialog
      :visible.sync="fileSelectVisible"
      title="选择文件"
      width="500px"
      :close-on-click-modal="false"
      @close="cancelFileSelect"
    >
      <div class="file-select-content">
        <div class="file-select-path">{{ fileSelectPath || '/' }}</div>
        <div class="file-list">
          <div
            v-for="(file, index) in fileList"
            :key="file.path"
            class="file-item"
            :class="{ active: index === fileSelectedIndex }"
            @click="fileSelectedIndex = index; confirmFileSelect(currentPanel)"
            @dblclick="fileSelectedIndex = index; confirmFileSelect(currentPanel)"
          >
            <span class="file-icon">{{ file.isDirectory ? '📁' : '📄' }}</span>
            <span class="file-name">{{ file.name }}</span>
          </div>
          <div v-if="fileList.length === 0" class="empty-files">加载中...</div>
        </div>
        <div class="file-select-hint">↑↓ 选择 | Enter 确认 | ESC 取消</div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { api } from '../api'
import { marked } from 'marked'

export default {
  name: 'CodeView',

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
      wsConnected: false,
      fileSelectVisible: false,
      fileSelectPath: '',
      fileList: [],
      fileSelectedIndex: 0,
      currentPanel: null,
      dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'],
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

  beforeDestroy() {
    this.activeSessions.forEach(panel => {
      if (panel.session?.id) {
        api.sessionWsDisconnect(panel.session.id)
      }
    })
  },

  methods: {
    async loadFileList(dirPath = '') {
      try {
        const res = await api.browseFilesystem(dirPath)
        this.fileList = res.data?.items || []
      } catch (e) {
        this.fileList = []
      }
    },

    onInputChange(value, panel) {
      const atIndex = value.lastIndexOf('@')
      if (atIndex !== -1) {
        const afterAt = value.slice(atIndex + 1)
        if (!afterAt.includes(' ') && !this.fileSelectVisible) {
          this.currentPanel = panel
          this.fileSelectPath = ''
          this.fileSelectedIndex = 0
          this.fileSelectVisible = true
          this.loadFileList('')
        }
      }
    },

    onFileSelectKeydown(e, panel) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.fileSelectedIndex = Math.max(0, this.fileSelectedIndex - 1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.fileSelectedIndex = Math.min(this.fileList.length - 1, this.fileSelectedIndex + 1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        this.confirmFileSelect(panel)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelFileSelect()
      }
    },

    confirmFileSelect(panel) {
      const file = this.fileList[this.fileSelectedIndex]
      if (file) {
        const atIndex = panel.input.lastIndexOf('@')
        let path = file.path
        if (file.isDirectory) {
          path += '/'
        }
        panel.input = panel.input.slice(0, atIndex) + path + ' '
      }
      this.fileSelectVisible = false
      this.currentPanel = null
    },

    cancelFileSelect() {
      this.fileSelectVisible = false
      this.currentPanel = null
    },

    getTodoStatusIcon(status) {
      const icons = {
        completed: '✅',
        in_progress: '🔄',
        pending: '⬜',
        cancelled: '❌'
      }
      return icons[status] || '⬜'
    },

    formatTime(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${min}`
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
        if (action === 'edit_file') {
          return parsed.file_path
        }
        if (action === 'write_file') {
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
      if (!text) return ''
      return marked(text)
    },

    initPanelWs(panel) {
      if (!panel.session?.id) return
      if (panel.wsConnected) return

      api.sessionWsConnect(
        panel.session.id,
        (msg) => {
          this.handlePanelWsMessage(panel, msg)
        },
        () => {
          panel.wsConnected = true
          console.log(`WebSocket [${panel.session.id}] 已连接`)
        },
        () => {
          panel.wsConnected = false
          console.log(`WebSocket [${panel.session.id}] 已断开`)
          setTimeout(() => {
            if (!api.sessionWsIsConnected(panel.session.id)) {
              this.initPanelWs(panel)
            }
          }, 3000)
        },
        (err) => {
          panel.wsConnected = false
          console.error(`WebSocket [${panel.session.id}] 错误:`, err)
        }
      )
    },

handlePanelWsMessage(panel, msg) {
      const { type, data, error } = msg;
      
      switch (type) {
        case 'todos':
          if (data?.todos) {
            panel.logItems.push({
              type: 'todos',
              todos: data.todos
            })
          }
          break
        case 'session':
          if (data?.sessionId && !panel.session.id) {
            panel.session.id = data.sessionId
          }
          break
        case 'step':
          if (data) {
            panel.logItems.push({ 
              type: 'step', 
              thought: data.thought, 
              actions: data.actions,
              success: data.success
            })
          }
          break
        case 'done':
          panel.disabled = false
          panel.stopping = false
          panel.dotAnimation = ''
          if (panel.dotInterval) {
            clearInterval(panel.dotInterval)
            panel.dotInterval = null
          }
          if (data?.modelName) {
            panel.modelName = data.modelName
          }
          if (data?.usage?.promptTokens) {
            panel.promptTokens = data.usage.promptTokens
          }
          if (data?.response) {
            panel.logItems.push({ type: 'think', content: data.response })
          }
          if (data?.sessionId) {
            this.loadSessions()
          }
          break
        case 'stopped':
          panel.disabled = false
          panel.stopping = false
          panel.dotAnimation = ''
          if (panel.dotInterval) {
            clearInterval(panel.dotInterval)
            panel.dotInterval = null
          }
          panel.logItems.push({ type: 'think', content: '【已停止】' })
          break
        case 'error':
          this.$message.error(error || '发生错误')
          panel.disabled = false
          panel.stopping = false
          panel.dotAnimation = ''
          if (panel.dotInterval) {
            clearInterval(panel.dotInterval)
            panel.dotInterval = null
          }
          break
      }
      
      this.$nextTick(() => {
        const panelIdx = this.activeSessions.indexOf(panel)
        if (panelIdx > -1) {
          const panels = this.$el?.querySelectorAll('.session-panel')
          const el = panels?.[panelIdx]
          if (el) {
            const logArea = el.querySelector('.log-area')
            if (logArea) {
              logArea.scrollTop = logArea.scrollHeight
            }
          }
        }
      })
    },

    setLayout(mode) {
      this.layoutMode = mode
      this.updateActiveSessions()
    },

    updateActiveSessions() {
      const count = this.layoutMode
      const newActive = []
      
      for (let i = 0; i < count; i++) {
        if (this.activeSessions[i]) {
          newActive.push(this.activeSessions[i])
        } else {
          newActive.push({
            session: null,
            logItems: [],
            userQuestion: '',
            modelName: '',
            input: '',
            disabled: false,
            stopping: false,
            wsConnected: false,
            promptTokens: 0,
            dotAnimation: '',
            dotInterval: null,
          })
        }
      }
      
      this.activeSessions = newActive
    },

    onDragStart(event, session) {
      this.draggedSession = session
      event.dataTransfer.effectAllowed = 'move'
    },

    onDropPanel(event, index) {
      if (this.draggedSession) {
        const panel = this.activeSessions[index]
        panel.session = this.draggedSession
        panel.logItems = []
        panel.userQuestion = ''
        panel.disabled = false
        panel.stopping = false
        panel.wsConnected = false
        panel.promptTokens = 0
        panel.dotAnimation = ''
        if (panel.dotInterval) {
          clearInterval(panel.dotInterval)
          panel.dotInterval = null
        }
        this.loadMessagesForPanel(panel, this.draggedSession.id)
        this.initPanelWs(panel)
        this.draggedSession = null
      }
    },

    bindSessionToPanel(session, panelIndex = null) {
      const idx = panelIndex !== null ? panelIndex : this.focusedPanelIndex
      if (idx >= 0 && idx < this.activeSessions.length) {
        const panel = this.activeSessions[idx]
        panel.session = session
        panel.logItems = []
        panel.userQuestion = ''
        panel.disabled = false
        panel.stopping = false
        panel.wsConnected = false
        panel.promptTokens = 0
        panel.dotAnimation = ''
        if (panel.dotInterval) {
          clearInterval(panel.dotInterval)
          panel.dotInterval = null
        }
        this.loadMessagesForPanel(panel, session.id)
        this.initPanelWs(panel)
      }
    },

    async loadMessagesForPanel(panel, sessionId) {
      try {
        const res = await api.getMessages(sessionId)
        panel.logItems = res.data || []
        if (panel.logItems.length > 0) {
          const userItem = panel.logItems.find(item => item.type === 'chat' || item.type === 'think')
          if (userItem) {
            panel.userQuestion = userItem.content
          }
        }
      } catch (e) {
        console.error('加载消息失败:', e)
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
    },

    async sendToPanel(panel) {
      const content = panel.input.trim()
      if (!content || panel.disabled) return

      panel.input = ''
      panel.disabled = true
      panel.stopping = false
      panel.userQuestion = content
      panel.logItems.push({ type: 'chat', content: content })

      let dotIdx = 0
      panel.dotAnimation = this.dots[dotIdx]
      panel.dotInterval = setInterval(() => {
        dotIdx = (dotIdx + 1) % this.dots.length
        panel.dotAnimation = this.dots[dotIdx]
      }, 150)

      if (api.sessionWsIsConnected(panel.session.id)) {
        api.sessionWsSend(panel.session.id, 'chat', {
          message: content,
          sessionId: panel.session?.id,
        })
      } else {
        this.initPanelWs(panel)
        setTimeout(() => {
          if (api.sessionWsIsConnected(panel.session.id)) {
            api.sessionWsSend(panel.session.id, 'chat', {
              message: content,
              sessionId: panel.session?.id,
            })
          }
        }, 500)
      }
    },

    stopPanel(panel) {
      if (!panel.session?.id || panel.stopping) return
      panel.stopping = true
      api.sessionWsSend(panel.session.id, 'stop', {
        sessionId: panel.session.id,
      })
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
            if (this.currentSession?.id === session.id) {
              this.currentSession.title = value
            }
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
              if (this.displayedSessions.length > 0) {
                this.selectSession(this.displayedSessions[0])
              } else {
                this.currentSession = null
              }
            }
            this.$message.success('删除成功')
          } catch (e) {
            this.$message.error('删除失败: ' + e.message)
          }
        }).catch(() => {})
      }
    },
  },
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

.session-panel:hover {
  border-color: #3b82f6;
}

.session-panel.panel-active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

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
  padding: 0 16px 16px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.log-area p {
  margin: 0 0 16px 0;
  color: #d4d4d8;
}

.user-question {
  color: #60a5fa;
  font-weight: bold;
}

.todos-list {
  margin-bottom: 16px;
  color: #d4d4d8;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.todo-status {
  font-size: 14px;
}

.todo-name {
  font-size: 14px;
}

.log-mute {
  color: #84848a;
  margin-bottom: 16px;
  white-space: pre;
}

.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }

.build-info {
  color: #84848a;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

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
.send-btn { height: auto; }
.stop-btn { height: auto; }

.ws-connected { color: #22c55e; }
.ws-disconnected { color: #ef4444; }

.footer {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 12px;
  border-top: 1px solid #27272a;
  flex-shrink: 0;
}

.footer-left { display: flex; gap: 16px; align-items: center; color: #84848a; }

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

.layout-switcher {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
}

.sidebar {
  width: 260px;
  background-color: #0a0a09;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #27272a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 12px;
  color: #84848a;
  font-weight: bold;
}

.new-btn { font-size: 12px; padding: 4px 8px; }
.sidebar-content { flex: 1; overflow-y: auto; }

.session-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #84848a;
  transition: all 0.2s;
  border-left: 2px solid transparent;
  position: relative;
}

.session-item:hover {
  background-color: #18191b;
  color: #d4d4d8;
}

.session-item:hover .session-actions { opacity: 1; }

.session-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-title { order: 1; }
.session-time { order: 2; font-size: 11px; color: #545459; }

.session-actions {
  order: 3;
  opacity: 0;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  transition: opacity 0.2s;
}

.action-btn {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  color: #84848a;
}

.action-btn:hover {
  background-color: #3f3f46;
  color: #d4d4d8;
}

.session-item.active {
  background-color: #18191b;
  border-left-color: #3b82f6;
  color: #f4f4f5;
}

.session-item.active .session-time { color: #60a5fa; }

.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.load-more { padding: 12px; text-align: center; border-top: 1px solid #27272a; }

.file-select-content { height: 400px; display: flex; flex-direction: column; }
.file-select-path { padding: 8px 12px; background: #27272a; color: #a1a1aa; font-size: 13px; border-radius: 4px; margin-bottom: 12px; }
.file-list { flex: 1; overflow-y: auto; border: 1px solid #3f3f46; border-radius: 4px; }
.file-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.2s; }
.file-item:hover { background: #27272a; }
.file-item.active { background: #3b82f6; }
.file-icon { font-size: 16px; }
.file-name { color: #d4d4d8; font-size: 14px; }
.file-item.active .file-name { color: #fff; }
.empty-files { padding: 20px; text-align: center; color: #71717a; }
.file-select-hint { margin-top: 12px; padding: 8px; background: #27272a; color: #a1a1aa; font-size: 12px; border-radius: 4px; text-align: center; }
</style>
