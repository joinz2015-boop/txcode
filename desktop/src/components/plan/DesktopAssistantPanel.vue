<template>
  <div class="assistant-panel" :style="{ width: panelWidth + 'px', minWidth: '260px' }">
    <div class="assistant-tabs">
      <button
        class="assistant-tab"
        :class="{ active: activeTab === 'design' }"
        @click="activeTab = 'design'"
      >AI方案助手</button>
      <button
        class="assistant-tab"
        :class="{ active: activeTab === 'discuss' }"
        @click="activeTab = 'discuss'"
      >探讨</button>
    </div>

    <div v-show="activeTab === 'design'" class="tab-panel">
      <div class="assistant-chat-messages" ref="designMessages">
        <div v-if="designLogItems.length === 0" class="assistant-empty">
          <p>输入需求描述，AI 将协助您完善方案。</p>
        </div>
        <template v-for="(item, idx) in designLogItems">
          <div v-if="item.type === 'todos'" :key="'td-' + idx" class="todos-list">
            <div v-for="(todo, tIdx) in item.todos" :key="'ti-' + tIdx" class="todo-item">
              <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
              <span class="todo-name">{{ todo.name }}</span>
            </div>
          </div>
          <div v-else-if="item.type === 'chat'" :key="'dc-' + idx" class="assistant-msg user">
            <div class="amsg-text">{{ item.content }}</div>
          </div>
          <div v-else-if="item.type === 'think'" :key="'dt-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
          <template v-else-if="item.type === 'step'" :key="'ds-' + idx">
            <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
            <div v-for="(tc, aIdx) in item.toolCalls" :key="'dst-' + aIdx" class="log-mute">
              <template v-if="tc.status === 'executing'">
                <span class="tool-spinner"></span>
                {{ getToolCallName(tc) }}
                <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
              </template>
              <template v-else>
                <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
                {{ getToolCallName(tc) }}
                <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
              </template>
            </div>
          </template>
          <div v-else :key="idx" class="assistant-msg" :class="item.role">
            <div class="amsg-text" v-html="renderMarkdown(item.content || '')"></div>
          </div>
        </template>
        <div v-if="designPanel.disabled" class="assistant-msg ai">
          <div class="amsg-text" style="color:var(--text-muted)">正在思考...</div>
        </div>
      </div>
      <div class="assistant-input-area">
        <div class="assistant-input-wrap">
          <textarea
            v-model="designPanel.input"
            placeholder="输入需求描述... (Enter 发送, Shift+Enter 换行)"
            rows="3"
            :disabled="designPanel.disabled"
            @keydown="handleAssistKeydown($event, 'design')"
          ></textarea>
          <button class="assistant-send-btn" @click="sendDesignMessage" :disabled="designPanel.disabled">↑</button>
        </div>
      </div>
      <div class="assistant-status-bar">
        <span :style="{ color: designPanel.disabled ? '#f59e0b' : '#22c55e' }">
          {{ designPanel.disabled ? (designStopping ? '■ 停止中' : '● 处理中') : '✓ 就绪' }}
        </span>
        <span class="sep">|</span>
        <span>模型: {{ currentModel }}</span>
        <template v-if="designPanel.disabled && !designStopping">
          <button class="stop-btn" @click="stopDesign">停止</button>
        </template>
      </div>
    </div>

    <div v-show="activeTab === 'discuss'" class="tab-panel">
      <div class="discuss-section">
        <div class="discuss-list">
          <div
            v-for="(d, idx) in discussList"
            :key="d.id"
            class="discuss-item"
            :class="{ active: currentDiscuss && currentDiscuss.id === d.id }"
            @click="switchDiscuss(d)"
          >
            <span class="discuss-item-title">{{ d.title }}</span>
            <button class="discuss-item-del" @click.stop="deleteDiscuss(idx)" title="删除">&times;</button>
          </div>
        </div>
        <button class="discuss-new-btn" @click="createDiscuss">+ 新建探讨</button>
        <div class="assistant-chat-messages" ref="discussMessages" style="flex:1;">
          <div v-if="discussLogItems.length === 0" class="assistant-empty">
            <p>选择一个探讨或创建新的探讨会话。</p>
          </div>
          <template v-for="(item, idx) in discussLogItems">
            <div v-if="item.type === 'todos'" :key="'td2-' + idx" class="todos-list">
              <div v-for="(todo, tIdx) in item.todos" :key="'ti2-' + tIdx" class="todo-item">
                <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                <span class="todo-name">{{ todo.name }}</span>
              </div>
            </div>
            <div v-else-if="item.type === 'chat'" :key="'dc2-' + idx" class="assistant-msg user">
              <div class="amsg-text">{{ item.content }}</div>
            </div>
            <div v-else-if="item.type === 'think'" :key="'dt2-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
            <template v-else-if="item.type === 'step'" :key="'ds2-' + idx">
              <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
              <div v-for="(tc, aIdx) in item.toolCalls" :key="'dst2-' + aIdx" class="log-mute">
                <template v-if="tc.status === 'executing'">
                  <span class="tool-spinner"></span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </template>
                <template v-else>
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </template>
              </div>
            </template>
            <div v-else :key="idx" class="assistant-msg" :class="item.role">
              <div class="amsg-text" v-html="renderMarkdown(item.content || '')"></div>
            </div>
          </template>
          <div v-if="discussPanel.disabled" class="assistant-msg ai">
            <div class="amsg-text" style="color:var(--text-muted)">正在思考...</div>
          </div>
        </div>
        <div class="assistant-input-area">
          <div class="assistant-input-wrap">
            <textarea
              v-model="discussPanel.input"
              placeholder="输入探讨内容... (Enter 发送, Shift+Enter 换行)"
              rows="3"
              :disabled="discussPanel.disabled"
              @keydown="handleAssistKeydown($event, 'discuss')"
            ></textarea>
            <button class="assistant-send-btn" @click="sendDiscussMessage" :disabled="discussPanel.disabled">↑</button>
          </div>
        </div>
        <div class="assistant-status-bar">
          <span :style="{ color: discussPanel.disabled ? '#f59e0b' : '#22c55e' }">
            {{ discussPanel.disabled ? (discussStopping ? '■ 停止中' : '● 处理中') : '✓ 就绪' }}
          </span>
          <span class="sep">|</span>
          <span>会话: {{ currentDiscussTitle }}</span>
          <template v-if="discussPanel.disabled && !discussStopping">
            <button class="stop-btn" @click="stopDiscuss">停止</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import { ws } from '@/utils/websocket'
import { createSession, deleteSession, saveMeta, getMessages } from '@/api/index'
import { setItem } from '@/utils/storage'

let logSeq = 10000

export default {
  name: 'DesktopAssistantPanel',
  props: {
    panelWidth: { type: Number, default: 370 },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null },
    planFilePath: { type: String, default: '' }
  },
  data() {
    return {
      activeTab: 'design',
      designStopping: false,
      discussStopping: false,
      designPanel: { sessionId: null, input: '', disabled: false, wsUnsubscribe: null },
      discussPanel: { sessionId: null, input: '', disabled: false, wsUnsubscribe: null },
      designLogItems: [],
      discussLogItems: [],
      discussList: [],
      currentDiscuss: null
    }
  },
  computed: {
    currentDiscussTitle() {
      return this.currentDiscuss ? this.currentDiscuss.title : '未选择'
    }
  },
  watch: {
    currentSession: {
      handler(val) {
        if (val) {
          this.initFromMeta(val.meta || {})
        }
      },
      immediate: true
    }
  },
  methods: {
    initFromMeta(meta) {
      this.designLogItems = []
      this.discussLogItems = []
      this.unsubscribeDesign()
      this.unsubscribeDiscuss()

      if (meta.designSessionId) {
        this.designPanel.sessionId = meta.designSessionId
        this.loadDesignMessages(meta.designSessionId)
        this.subscribePanel('design', meta.designSessionId)
      } else {
        this.designPanel.sessionId = null
        this.designPanel.disabled = false
      }
      this.discussList = meta.discussSessions || []
      if (this.discussList.length > 0 && !this.currentDiscuss) {
        this.switchDiscuss(this.discussList[0])
      }
    },

    getMeta() {
      return this.currentSession ? (this.currentSession.meta || {}) : {}
    },

    async saveMetaToServer(meta) {
      if (!this.currentSession) return
      try {
        await saveMeta(this.currentSession.folderName, meta)
        this.currentSession.meta = meta
        setItem('planSession:current', this.currentSession)
      } catch (e) {
        console.error('保存meta失败:', e)
      }
    },

    async ensureDesignSession() {
      let sid = this.designPanel.sessionId
      if (!sid) {
        const r = await createSession(this.currentSession ? this.currentSession.folderName + '_design' : '方案助手')
        sid = r.data.id
        this.designPanel.sessionId = sid
        const meta = { ...this.getMeta(), designSessionId: sid, updatedAt: new Date().toISOString() }
        await this.saveMetaToServer(meta)
      }
      return sid
    },

    async sendDesignMessage() {
      const val = this.designPanel.input.trim()
      if (!val || this.designPanel.disabled) return
      try {
        const sid = await this.ensureDesignSession()
        this.subscribePanel('design', sid)
        this.pushLogItem('designLogItems', { type: 'chat', content: val, role: 'user' })
        this.designPanel.input = ''
        this.designPanel.disabled = true
        this.designStopping = false

        let contextPrefix = ''
        const parentPath = this.currentSession?.meta?.parentPlanPath
        if (parentPath) {
          contextPrefix = `父方案路径：${parentPath}\n`
        }
        ws.send('chat', {
          message: `${contextPrefix}用户输入: ${val}`,
          sessionId: sid,
          modelName: this.currentModel,
          agent: 'plan',
          planFilePath: this.planFilePath
        })

        if (this.currentSession && this.currentSession.meta.sessionName === '新计划会话') {
          ws.send('name_session', { sessionId: sid, folderName: this.currentSession.folderName, userInput: val })
        }
        this.$nextTick(() => this.scrollMessages('design'))
      } catch (e) {
        console.error('发送失败:', e)
        alert('发送失败: ' + e.message)
      }
    },

    stopDesign() {
      if (!this.designPanel.sessionId || this.designStopping) return
      this.designStopping = true
      ws.send('stop', { sessionId: this.designPanel.sessionId })
    },

    async sendDiscussMessage() {
      const val = this.discussPanel.input.trim()
      if (!val || this.discussPanel.disabled || !this.discussPanel.sessionId) return
      this.subscribePanel('discuss', this.discussPanel.sessionId)
      this.pushLogItem('discussLogItems', { type: 'chat', content: val, role: 'user' })
      this.discussPanel.input = ''
      this.discussPanel.disabled = true
      this.discussStopping = false

      ws.send('chat', {
        message: `方案路径：${this.planFilePath}\n\n这个是对这个方案的探讨 你只需要回答用户的问题即可 不需要修改方案 也不要修改代码\n\n用户输入: ${val}`,
        sessionId: this.discussPanel.sessionId,
        modelName: this.currentModel,
        agent: 'discuss'
      })
      this.$nextTick(() => this.scrollMessages('discuss'))
    },

    stopDiscuss() {
      if (!this.discussPanel.sessionId || this.discussStopping) return
      this.discussStopping = true
      ws.send('stop', { sessionId: this.discussPanel.sessionId })
    },

    subscribePanel(key, sessionId) {
      const panelKey = key === 'design' ? 'designPanel' : 'discussPanel'
      const stoppingKey = key === 'design' ? 'designStopping' : 'discussStopping'
      const logKey = key === 'design' ? 'designLogItems' : 'discussLogItems'

      if (this[panelKey].wsUnsubscribe) this[panelKey].wsUnsubscribe()

      this[panelKey].wsUnsubscribe = ws.subscribe(sessionId, {
        done: (d) => {
          this[logKey] = this[logKey].filter(item => !(item.type === 'step' && item._executing))
          this[panelKey].disabled = false
          this[stoppingKey] = false
          if (d.response) {
            this.pushLogItem(logKey, { type: 'think', content: d.response })
            this.$nextTick(() => this.scrollMessages(key))
          }
          if (key === 'design') {
            this.$emit('planUpdated')
          }
        },
        stopped: () => {
          this[logKey] = this[logKey].filter(item => !(item.type === 'step' && item._executing))
          this[panelKey].disabled = false
          this[stoppingKey] = false
          this.pushLogItem(logKey, { type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollMessages(key))
        },
        error: (d) => {
          this[logKey] = this[logKey].filter(item => !(item.type === 'step' && item._executing))
          this[panelKey].disabled = false
          this[stoppingKey] = false
          alert(d.error || '发生错误')
        },
        step: (d) => {
          const hasExecuting = d.toolCalls && d.toolCalls.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this[logKey] = this[logKey].filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.pushLogItem(logKey, { type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration, _executing: true })
          } else {
            this[logKey] = this[logKey].filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.pushLogItem(logKey, { type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration })
          }
          if (d.usage && d.usage.promptTokens) this[panelKey].promptTokens = d.usage.promptTokens
          this.$nextTick(() => this.scrollMessages(key))
        },
        todos: (d) => {
          this.pushLogItem(logKey, { type: 'todos', todos: d.todos })
          this.$nextTick(() => this.scrollMessages(key))
        },
        compact: () => {
          if (key === 'design') this.loadDesignMessages(this[panelKey].sessionId)
          else this.loadDiscussMessages(this[panelKey].sessionId)
        }
      })
    },

    async loadDesignMessages(sessionId) {
      try {
        const r = await getMessages(sessionId)
        this.designLogItems = (r.data || []).map(i => {
          if (i.type === 'think') return this.withLogId({ type: 'think', content: i.content || '' })
          if (i.type === 'step') return this.withLogId(i)
          if (i.type === 'todos') return this.withLogId({ type: 'todos', todos: i.todos })
          return this.withLogId(i)
        })
      } catch { this.designLogItems = [] }
    },

    async loadDiscussMessages(sessionId) {
      try {
        const r = await getMessages(sessionId)
        this.discussLogItems = (r.data || []).map(i => {
          if (i.type === 'think') return this.withLogId({ type: 'think', content: i.content || '' })
          if (i.type === 'step') return this.withLogId(i)
          if (i.type === 'todos') return this.withLogId({ type: 'todos', todos: i.todos })
          return this.withLogId(i)
        })
      } catch { this.discussLogItems = [] }
    },

    unsubscribeDesign() {
      if (this.designPanel.wsUnsubscribe) {
        this.designPanel.wsUnsubscribe()
        this.designPanel.wsUnsubscribe = null
      }
    },
    unsubscribeDiscuss() {
      if (this.discussPanel.wsUnsubscribe) {
        this.discussPanel.wsUnsubscribe()
        this.discussPanel.wsUnsubscribe = null
      }
    },

    async createDiscuss() {
      const title = `探讨${(this.discussList.length + 1)}`
      try {
        const r = await createSession(title)
        const d = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), sessionId: r.data.id, title, createdAt: new Date().toISOString() }
        const meta = { ...this.getMeta() }
        meta.discussSessions = [...(meta.discussSessions || []), d]
        meta.updatedAt = new Date().toISOString()
        await this.saveMetaToServer(meta)
        this.discussList = meta.discussSessions
        this.switchDiscuss(d)
      } catch (e) {
        console.error('创建探讨失败:', e)
        alert('创建探讨失败: ' + e.message)
      }
    },

    switchDiscuss(d) {
      if (!d) return
      this.unsubscribeDiscuss()
      this.currentDiscuss = d
      this.discussPanel = { sessionId: d.sessionId, input: '', disabled: false, wsUnsubscribe: null }
      this.loadDiscussMessages(d.sessionId)
      this.subscribePanel('discuss', d.sessionId)
    },

    async deleteDiscuss(idx) {
      const item = this.discussList[idx]
      const wasActive = this.currentDiscuss && this.currentDiscuss.id === item.id
      try {
        if (item.sessionId) await deleteSession(item.sessionId)
      } catch (e) {}
      const meta = { ...this.getMeta() }
      meta.discussSessions = meta.discussSessions.filter(d => d.id !== item.id)
      meta.updatedAt = new Date().toISOString()
      await this.saveMetaToServer(meta)
      this.discussList = meta.discussSessions

      if (wasActive) {
        this.unsubscribeDiscuss()
        if (this.discussList.length > 0) {
          this.switchDiscuss(this.discussList[0])
        } else {
          this.currentDiscuss = null
          this.discussLogItems = []
          this.discussPanel = { sessionId: null, input: '', disabled: false, wsUnsubscribe: null }
        }
      }
    },

    handleAssistKeydown(e, type) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (type === 'design') this.sendDesignMessage()
        else this.sendDiscussMessage()
      }
    },

    getTodoStatusIcon(status) {
      const icons = { completed: '✅', in_progress: '🔄', pending: '⬜', cancelled: '❌' }
      return icons[status] || '⬜'
    },

    getToolCallName(tc) {
      return tc ? (tc.function ? tc.function.name : tc.name) : 'unknown_tool'
    },

    getToolCallArguments(tc) {
      return tc && tc.function ? tc.function.arguments : (tc.arguments || '')
    },

    formatInput(action, input) {
      if (!input) return ''
      try {
        const parsed = JSON.parse(input)
        if (action === 'bash' || action === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ' (' + parsed.workdir + ')' : '')
        }
        if (action === 'read_file') {
          return parsed.file_path + (parsed.offset ? ':' + parsed.offset : '')
        }
        if (action === 'edit_file' || action === 'write_file') {
          return parsed.file_path || ''
        }
        if (action === 'glob' || action === 'find_files') {
          return parsed.pattern + (parsed.directory ? ' (' + parsed.directory + ')' : '')
        }
        if (action === 'grep' || action === 'search_content') {
          return '"' + parsed.pattern + '" (' + (parsed.directory || '') + ')'
        }
        return input
      } catch {
        return input
      }
    },

    renderMarkdown(text) {
      if (!text) return ''
      try {
        return marked.parse(text)
      } catch {
        return this.escapeHtml(String(text))
      }
    },

    createThinkItem(content) {
      return { type: 'think', content, renderedContent: this.renderMarkdown(content) }
    },

    createStepItem(data) {
      const thought = (data && data.thought) || ''
      return {
        type: 'step',
        thought,
        renderedThought: this.renderMarkdown(thought),
        toolCalls: Array.isArray(data && data.toolCalls) ? data.toolCalls.filter(Boolean) : [],
        success: data && data.success,
        iteration: data && data.iteration
      }
    },

    pushLogItem(logKey, item) {
      this[logKey].push(this.withLogId(item))
      const max = 400
      if (this[logKey].length > max) {
        this[logKey].splice(0, this[logKey].length - max)
      }
    },

    withLogId(item) {
      return { ...item, logId: ++logSeq }
    },

    escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },

    scrollMessages(type) {
      const ref = type === 'design' ? 'designMessages' : 'discussMessages'
      const el = this.$refs[ref]
      if (el) {
        this.$nextTick(() => { el.scrollTop = el.scrollHeight })
      }
    }
  },
  beforeDestroy() {
    this.unsubscribeDesign()
    this.unsubscribeDiscuss()
  }
}
</script>

<style scoped>
.assistant-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}
.assistant-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg-titlebar);
}
.assistant-tab {
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  font-family: inherit;
}
.assistant-tab:hover { color: var(--text-primary); }
.assistant-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.assistant-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.assistant-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
.assistant-msg { margin-bottom: 12px; font-size: 12.5px; line-height: 1.6; }
.assistant-msg.user { text-align: right; }
.assistant-msg.user .amsg-text {
  display: inline-block;
  background: var(--accent-light);
  color: var(--accent);
  padding: 6px 12px;
  border-radius: 10px 2px 10px 10px;
  max-width: 85%;
  text-align: left;
}
.assistant-msg.ai .amsg-text {
  display: inline-block;
  background: var(--bg-input);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 2px 10px 10px 10px;
  max-width: 85%;
}
.amsg-text :deep(p) { margin: 3px 0; }
.amsg-text :deep(pre) { background: #f1f2f6; border-radius: 4px; padding: 6px 10px; font-size: 11px; overflow-x: auto; margin: 4px 0; }
.amsg-text :deep(code) { background: #f1f2f6; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
.assistant-input-area {
  border-top: 1px solid var(--border);
  padding: 8px 10px;
  background: #fff;
}
.assistant-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 5px 6px 5px 10px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
}
.assistant-input-wrap:focus-within {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79,110,247,0.06);
}
.assistant-input-wrap textarea {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
  font-family: inherit;
  resize: none;
  min-height: 60px;
  max-height: 120px;
}
.assistant-input-wrap textarea:disabled { opacity: 0.6; }
.assistant-input-wrap textarea::placeholder { color: var(--text-muted); }
.assistant-send-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.assistant-send-btn:hover { filter: brightness(1.08); }
.assistant-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.assistant-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-top: 1px solid var(--border);
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--bg-titlebar);
}
.sep { color: var(--border); }
.stop-btn {
  font-size: 10px;
  padding: 2px 6px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
}
.stop-btn:hover { background: #dc2626; }

.discuss-section { display: flex; flex-direction: column; height: 100%; }
.discuss-list {
  padding: 6px;
  border-bottom: 1px solid var(--border);
  max-height: 120px;
  overflow-y: auto;
}
.discuss-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.1s;
}
.discuss-item:hover { background: var(--bg-hover); }
.discuss-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.discuss-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.discuss-item-del {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  font-size: 14px;
  display: none;
  align-items: center;
  justify-content: center;
}
.discuss-item:hover .discuss-item-del { display: flex; }
.discuss-item-del:hover { color: var(--red); }
.discuss-new-btn {
  width: 100%;
  padding: 5px;
  margin: 2px 0;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  transition: all 0.15s;
  font-family: inherit;
}
.discuss-new-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

.tool-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px; vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }
.tool-success { color: #22c55e; font-weight: 600; }
.tool-fail { color: #ef4444; font-weight: 600; }
.tool-input { color: var(--accent); margin-left: 6px; font-size: 11.5px; }
.log-mute { color: var(--text-muted); padding: 3px 0; font-size: 12px; }
.ai-thought { color: var(--text-primary); margin-bottom: 12px; line-height: 1.6; font-size: 12.5px; }
.ai-thought :deep(p) { margin: 4px 0; }
.todos-list { margin-bottom: 12px; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12.5px; }
.todo-status { flex-shrink: 0; }
.todo-name { color: var(--text-primary); }
</style>
