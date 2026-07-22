<template>
  <div class="test-chat-panel" :style="{ width: width + 'px', flexShrink: 0 }">
    <div class="session-header">
      <div class="session-dropdown" v-if="testSessions.length > 0">
        <button class="session-dropdown-toggle" @click="sessionDropdownOpen = !sessionDropdownOpen">
          <span class="session-title-text">{{ currentTestSession ? currentTestSession.title : '选择会话' }}</span>
          <span class="dropdown-arrow" :class="{ open: sessionDropdownOpen }">▾</span>
        </button>
        <div v-if="sessionDropdownOpen" class="session-dropdown-menu">
          <div
            v-for="s in testSessions"
            :key="s.id"
            class="session-dropdown-item"
            :class="{ active: currentTestSession && currentTestSession.id === s.id }"
          >
            <span class="s-item-title" @click="switchTestSession(s)">{{ s.title }}</span>
            <span class="s-item-meta">{{ s.testUrl }}</span>
            <span class="s-item-actions" @click.stop>
              <span class="menu-trigger" @click.stop="menuId = menuId === s.id ? null : s.id">⋮</span>
              <div class="disc-menu-popup" v-if="menuId === s.id">
                <div class="menu-item" @click.stop="startRename(s)">重命名</div>
                <div class="menu-item danger" @click.stop="confirmDelete(s)">删除</div>
              </div>
            </span>
          </div>
          <button class="session-new-btn" @click="createTestSession">+ 新建测试会话</button>
        </div>
      </div>
      <button v-else class="session-new-btn-standalone" @click="createTestSession">+ 新建测试会话</button>
      <span v-if="currentTestSession && currentTestSession.testUrl" class="session-url-badge">{{ currentTestSession.testUrl }}</span>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-if="logItems.length === 0" class="empty-hint">
        <p>输入测试要求，AI 将通过 Playwright 自动操控浏览器</p>
        <p class="hint-sub">例如："请登录系统，账号 admin，密码 123456"</p>
      </div>
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
        <div v-else-if="item.type === 'step'" :key="idx" class="step-block">
          <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
          <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
            <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
            {{ getToolCallName(tc) }}
            <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
          </div>
          <div v-if="item.screenshot" class="step-screenshot">
            <img :src="'data:image/png;base64,' + item.screenshot" class="screenshot-img" @click="openImagePreview(item.screenshot)" />
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

    <div v-if="renameVisible" class="rename-dialog-overlay" @click.self="renameVisible = false">
      <div class="rename-dialog">
        <div class="rename-dialog-title">重命名会话</div>
        <input v-model="renameValue" class="rename-input" @keydown.enter="doRename" />
        <div class="rename-dialog-actions">
          <button class="action-btn" @click="renameVisible = false">取消</button>
          <button class="action-btn btn-send" @click="doRename">确定</button>
        </div>
      </div>
    </div>

    <div v-if="deleteVisible" class="rename-dialog-overlay" @click.self="deleteVisible = false">
      <div class="rename-dialog">
        <div class="rename-dialog-title">删除确认</div>
        <p style="text-align:center;padding:12px 0;">确定要删除会话 <strong>{{ deleteTarget ? deleteTarget.title : '' }}</strong> 吗？此操作不可恢复。</p>
        <div class="rename-dialog-actions">
          <button class="action-btn" @click="deleteVisible = false">取消</button>
          <button class="action-btn btn-stop" @click="doDelete">确定删除</button>
        </div>
      </div>
    </div>

    <div v-if="previewImage" class="image-lightbox" @click="previewImage = null">
      <span class="lightbox-close" @click="previewImage = null">&times;</span>
      <img :src="'data:image/png;base64,' + previewImage" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import { setItem } from '@/utils/storage'
import { getPlanSessionDetail, saveMeta, createSession, getMessages, deleteSession } from '@/api'

let logSeq = 0

export default {
  name: 'DesktopTestChatPanel',
  props: {
    sessionId: { type: String, default: '' },
    planFilePath: { type: String, default: '' },
    planFolderName: { type: String, default: '' },
    webContentsId: { type: Number, default: null },
    modelName: { type: String, default: '' },
    backendPort: { type: String, default: '41000' },
    projectPath: { type: String, default: '' },
    width: { type: Number, default: 420 },
  },
  emits: ['session-created'],
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      currentSessionId: this.sessionId || '',
      logItems: [],
      previewImage: null,
      ws: null,
      _wsUnsubs: [],
      testSessions: [],
      currentTestSession: null,
      sessionDropdownOpen: false,
      menuId: null,
      renameVisible: false,
      renameTarget: null,
      renameValue: '',
      deleteVisible: false,
      deleteTarget: null,
      _metaLoaded: false,
    }
  },
  computed: {
    canSend() {
      return this.inputMessage.trim().length > 0 && !this.disabled
    },
    sessionIdDisplay() {
      return this.currentSessionId ? this.currentSessionId.slice(-8) : '新建'
    },
  },
  methods: {
    getBaseURL() {
      return `http://localhost:${this.backendPort}`
    },

    async loadMeta() {
      if (!this.planFolderName || this._metaLoaded) return
      try {
        const r = await getPlanSessionDetail(this.planFolderName)
        if (r.data && r.data.meta) {
          const meta = r.data.meta
          this.testSessions = meta.testSessions || []
          if (this.testSessions.length > 0 && !this.currentTestSession) {
            this.switchTestSession(this.testSessions[0])
          }
        }
        this._metaLoaded = true
      } catch (e) {
        console.error('加载测试会话列表失败:', e)
      }
    },

    async persistMeta() {
      if (!this.planFolderName) return
      try {
        const r = await getPlanSessionDetail(this.planFolderName)
        if (r.data && r.data.meta) {
          const meta = r.data.meta
          meta.testSessions = this.testSessions
          meta.updatedAt = new Date().toISOString()
          await saveMeta(this.planFolderName, meta)
        }
      } catch (e) {
        console.error('保存测试会话列表失败:', e)
      }
    },

    async createTestSession() {
      const title = `测试${this.testSessions.length + 1}`
      try {
        const r = await createSession(title)
        const s = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          sessionId: r.data.id,
          title,
          testUrl: '',
          createdAt: new Date().toISOString(),
        }
        this.testSessions.push(s)
        await this.persistMeta()
        this.switchTestSession(s)
        this.sessionDropdownOpen = false
      } catch (e) {
        console.error('创建测试会话失败:', e)
        alert('创建测试会话失败: ' + e.message)
      }
    },

    switchTestSession(s) {
      if (!s) return
      this.disabled = false
      this.stopping = false
      this.currentTestSession = s
      this.currentSessionId = s.sessionId
      this.logItems = []
      this.promptTokens = 0
      this.sessionDropdownOpen = false
      this.loadHistoryMessages(s.sessionId)
      this.connectWS()
      this.$emit('session-created', s.sessionId)
    },

    async loadHistoryMessages(sessionId) {
      try {
        const r = await getMessages(sessionId)
        const msgs = r.data || []
        this.logItems = msgs.map(i => {
          if (i.type === 'think') return { type: 'think', content: i.content || '', _seq: ++logSeq }
          if (i.type === 'step') return { type: 'step', ...i, _seq: ++logSeq }
          if (i.type === 'todos') return { type: 'todos', todos: i.todos, _seq: ++logSeq }
          if (i.type === 'chat') return { type: 'chat', content: i.content, role: i.role, _seq: ++logSeq }
          if (i.type === 'system') return { type: 'system', content: i.content, _seq: ++logSeq }
          return { role: i.role, content: i.content, _seq: ++logSeq }
        })
        this.$nextTick(() => this.scrollToBottom())
      } catch (e) {
        console.error('加载历史消息失败:', e)
        this.logItems = []
      }
    },

    startRename(s) {
      this.menuId = null
      this.renameTarget = s
      this.renameValue = s.title
      this.renameVisible = true
    },

    async doRename() {
      const newName = this.renameValue.trim()
      if (!newName || !this.renameTarget) return
      this.renameTarget.title = newName
      if (this.currentTestSession && this.currentTestSession.id === this.renameTarget.id) {
        this.currentTestSession.title = newName
      }
      await this.persistMeta()
      this.renameVisible = false
      this.renameTarget = null
    },

    confirmDelete(s) {
      this.menuId = null
      this.deleteTarget = s
      this.deleteVisible = true
    },

    async doDelete() {
      if (!this.deleteTarget) return
      const item = this.deleteTarget
      const wasActive = this.currentTestSession && this.currentTestSession.id === item.id
      try {
        if (item.sessionId) await deleteSession(item.sessionId)
      } catch (e) {}
      this.testSessions = this.testSessions.filter(s => s.id !== item.id)
      await this.persistMeta()
      this.deleteVisible = false
      this.deleteTarget = null

      if (wasActive) {
        if (this.testSessions.length > 0) {
          this.switchTestSession(this.testSessions[0])
        } else {
          this.currentTestSession = null
          this.currentSessionId = ''
          this.logItems = []
          this.promptTokens = 0
        }
      }
    },

    connectWS() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return
      const url = `ws://localhost:${this.backendPort}/ws/code`
      this.ws = new WebSocket(url)
      this.ws.onopen = () => {
        console.log('[TestChatPanel] WS connected')
      }
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this.handleWSMessage(msg)
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }
      this.ws.onclose = () => {
        console.log('[TestChatPanel] WS disconnected')
        this.ws = null
      }
    },
    handleWSMessage(msg) {
      switch (msg.type) {
        case 'step': {
          const step = msg.data || msg
          const si = step.sessionId
          const myId = this.currentSessionId
          if (si && myId && !si.includes(myId) && !myId.includes(si)) return
          this.logItems.push({ type: 'step', ...step, _seq: ++logSeq })
          this.promptTokens = step.usage?.totalTokens || this.promptTokens
          break
        }
        case 'done': {
          const done = msg.data || msg
          const si = done.sessionId
          const myId = this.currentSessionId
          if (si && myId && !si.includes(myId) && !myId.includes(si)) return
          this.logItems.push({ type: 'system', content: done.response || '完成', _seq: ++logSeq })
          this.promptTokens = done.usage?.totalTokens || this.promptTokens
          this.disabled = false
          this.stopping = false
          break
        }
        case 'stopped': {
          const ss = msg.sessionId || (msg.data && msg.data.sessionId)
          const myId = this.currentSessionId
          if (ss && myId && !ss.includes(myId) && !myId.includes(ss)) return
          this.logItems.push({ type: 'system', content: '已停止', _seq: ++logSeq })
          this.disabled = false
          this.stopping = false
          break
        }
        case 'error': {
          const es = msg.sessionId || (msg.data && msg.data.sessionId)
          const myId = this.currentSessionId
          if (es && myId && !es.includes(myId) && !myId.includes(es)) return
          this.logItems.push({ type: 'system', content: '错误: ' + (msg.error || '未知'), _seq: ++logSeq })
          this.disabled = false
          this.stopping = false
          break
        }
        default:
          break
      }
      this.$nextTick(() => this.scrollToBottom())
    },
    scrollToBottom() {
      const c = this.$refs.messagesContainer
      if (c) {
        c.scrollTop = c.scrollHeight
      }
    },
    async sendMessage() {
      const text = this.inputMessage.trim()
      if (!text || this.disabled) return
      this.connectWS()

      if (!this.currentTestSession) {
        await this.createTestSession()
      }
      if (!this.currentSessionId) {
        this.currentSessionId = this.currentTestSession ? this.currentTestSession.sessionId : ''
      }

      this.logItems.push({ type: 'chat', content: text, _seq: ++logSeq })
      this.disabled = true
      this.inputMessage = ''
      this.$nextTick(() => this.scrollToBottom())

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const payload = {
          type: 'chat',
          data: {
            message: text,
            sessionId: this.currentSessionId,
            agent: 'test',
            planFilePath: this.planFilePath,
            webContentsId: this.webContentsId,
            projectPath: this.projectPath,
          },
        }
        this.ws.send(JSON.stringify(payload))
      } else {
        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const payload = {
              type: 'chat',
              data: {
                message: text,
                sessionId: this.currentSessionId,
                agent: 'test',
                planFilePath: this.planFilePath,
                webContentsId: this.webContentsId,
                projectPath: this.projectPath,
              },
            }
            this.ws.send(JSON.stringify(payload))
          } else {
            this.logItems.push({ type: 'system', content: 'WebSocket 未连接', _seq: ++logSeq })
            this.disabled = false
          }
        }, 500)
      }
    },
    stopChat() {
      this.stopping = true
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'stop', data: { sessionId: this.currentSessionId } }))
      }
    },
    fillTestCommand() {
      if (this.disabled) return
      let cmd = '请执行以下测试方案：\n\n'
      if (this.planFilePath) {
        cmd += `根据方案文件 ${this.planFilePath} 设计并执行完整的测试流程。`
      } else {
        cmd += '请设计并执行完整的测试流程。'
      }
      this.inputMessage = cmd
      this.$nextTick(() => {
        const ta = this.$el.querySelector('textarea')
        if (ta) ta.focus()
      })
    },
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },
    getToolCallName(tc) {
      if (typeof tc === 'object' && tc !== null) {
        return tc.function?.name || tc.name || 'unknown'
      }
      return 'unknown'
    },
    getToolCallArguments(tc) {
      if (typeof tc === 'object' && tc !== null) {
        let args = tc.function?.arguments
        if (!args) return null
        if (typeof args === 'string') {
          try { return JSON.parse(args) } catch { return args }
        }
        return args
      }
      return null
    },
    formatInput(toolName, args) {
      if (!args) return ''
      if (toolName === 'bash' && args.command) return args.command.length > 60 ? args.command.slice(0, 60) + '...' : args.command
      if (toolName === 'write_file' && args.file_path) return args.file_path.split('/').pop() || args.file_path
      if (toolName === 'read_file' && args.file_path) return args.file_path.split('/').pop() || args.file_path
      if (toolName === 'edit_file' && args.file_path) return args.file_path.split('/').pop() || args.file_path
      if (toolName === 'grep' && args.pattern) return args.pattern.length > 40 ? args.pattern.slice(0, 40) + '...' : args.pattern
      return ''
    },
    getTodoStatusIcon(status) {
      const icons = { pending: '○', in_progress: '◉', completed: '●', cancelled: '✕' }
      return icons[status] || '○'
    },
    renderMarkdown(text) {
      if (!text) return ''
      try {
        return marked(text, { breaks: true })
      } catch {
        return text
      }
    },
    openImagePreview(base64) {
      this.previewImage = base64
    },
  },
  mounted() {
    this.connectWS()
    this.loadMeta()
  },
  activated() {
    this.loadMeta()
  },
  beforeDestroy() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  },
}
</script>

<style scoped>
.test-chat-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid var(--border, #e0e0e0);
}

.session-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border, #e0e0e0);
  background: var(--bg-titlebar, #fafafa);
  min-height: 36px;
}

.session-dropdown {
  position: relative;
  flex: 1;
}

.session-dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  text-align: left;
}

.session-title-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform 0.15s;
}
.dropdown-arrow.open { transform: rotate(180deg); }

.session-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
  margin-top: 2px;
}

.session-dropdown-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  gap: 6px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.session-dropdown-item:hover { background: #f5f6fa; }
.session-dropdown-item.active { background: #e8f0fe; }

.s-item-title {
  flex: 1;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-item-meta {
  font-size: 10px;
  color: var(--text-muted, #999);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-item-actions {
  position: relative;
  flex-shrink: 0;
}

.menu-trigger {
  cursor: pointer;
  padding: 2px 4px;
  font-size: 14px;
  color: var(--text-muted, #888);
  border-radius: 4px;
}
.menu-trigger:hover { background: #e0e0e0; }

.disc-menu-popup {
  position: absolute;
  right: 0;
  top: 100%;
  background: #fff;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  z-index: 101;
  min-width: 80px;
  white-space: nowrap;
}

.menu-item {
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
}
.menu-item:hover { background: #f0f0f0; }
.menu-item.danger { color: #ef4444; }

.session-new-btn {
  width: 100%;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--accent, #4f6ef7);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
}
.session-new-btn:hover { background: #e8f0fe; }

.session-new-btn-standalone {
  flex: 1;
  padding: 6px 12px;
  border: 1px dashed var(--border, #d0d0d0);
  border-radius: 6px;
  background: transparent;
  color: var(--accent, #4f6ef7);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
}
.session-new-btn-standalone:hover { background: #f0f5ff; }

.session-url-badge {
  font-size: 10px;
  color: var(--text-muted, #999);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 4px;
  flex-shrink: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.empty-hint {
  text-align: center;
  color: var(--text-muted, #999);
  padding-top: 60px;
}
.empty-hint p { margin: 4px 0; }
.hint-sub { font-size: 12px; opacity: 0.7; }

.user-msg { display: flex; justify-content: flex-end; margin: 8px 0; }
.user-bubble {
  background: var(--accent, #4f6ef7);
  color: #fff;
  padding: 8px 14px;
  border-radius: 14px 14px 4px 14px;
  max-width: 85%;
  word-break: break-word;
  font-size: 13px;
}

.ai-thought {
  color: var(--text-muted, #666);
  font-size: 12px;
  margin: 6px 0;
  padding: 6px 10px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #e0e0e0;
}

.log-mute {
  font-size: 11.5px;
  color: var(--text-muted, #888);
  margin: 2px 0;
  padding: 2px 8px;
}

.tool-success { color: #22c55e; font-weight: bold; margin-right: 4px; }
.tool-fail { color: #ef4444; font-weight: bold; margin-right: 4px; }
.tool-input { color: var(--text-primary, #333); font-family: monospace; font-size: 11px; margin-left: 4px; }

.step-block { margin: 6px 0; }
.step-screenshot { margin: 8px 0; }
.screenshot-img {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border, #e0e0e0);
  cursor: pointer;
  transition: transform 0.15s;
}
.screenshot-img:hover { transform: scale(1.02); }

.system-msg {
  text-align: center;
  color: var(--text-muted, #999);
  font-size: 11.5px;
  margin: 8px 0;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  font-size: 8px;
  color: var(--accent, #4f6ef7);
}

.input-area {
  border-top: 1px solid var(--border, #e0e0e0);
  padding: 8px 10px;
  background: var(--bg-titlebar, #fafafa);
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

textarea {
  width: 100%;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
  box-sizing: border-box;
}
textarea:focus { border-color: var(--accent, #4f6ef7); }

.input-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #888);
}

.sep { color: var(--border, #d0d0d0); }

.status-ready { color: #22c55e; }
.status-thinking { color: var(--accent, #4f6ef7); }

.thinking-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--accent, #4f6ef7);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
}

@keyframes spin { to { transform: rotate(360deg); } }

.actions-spacer { flex: 1; }

.action-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  font-family: inherit;
  transition: opacity 0.15s;
}
.action-btn:disabled { opacity: 0.5; cursor: default; }
.action-btn:hover:not(:disabled) { opacity: 0.85; }

.btn-test { background: #e8f0fe; color: var(--accent, #4f6ef7); }
.btn-stop { background: #fef2f2; color: #ef4444; }
.btn-send { background: var(--accent, #4f6ef7); color: #fff; }

.todos-list { margin: 6px 0; }
.todo-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; }
.todo-status { font-size: 10px; min-width: 16px; text-align: center; }
.todo-name { color: var(--text-primary, #333); }

.image-lightbox {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
  z-index: 10000;
}
.lightbox-close {
  position: absolute; top: 20px; right: 30px; font-size: 30px; color: #fff; cursor: pointer;
}
.lightbox-image {
  max-width: 90%; max-height: 90%; border-radius: 8px;
}

.rename-dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.rename-dialog {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.rename-dialog-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.rename-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}
.rename-input:focus { border-color: var(--accent, #4f6ef7); }

.rename-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
