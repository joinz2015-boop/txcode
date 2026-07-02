<template>
  <el-dialog
    :visible="visible"
    title="测试验收"
    width="900px"
    top="3vh"
    :close-on-click-modal="false"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <div class="test-chat-messages" ref="messagesContainer">
      <div v-if="!logItems.length" class="empty-state">
        <p>输入测试要求进行验收</p>
      </div>
      <template v-for="(item, idx) in logItems">
        <div v-if="item.type === 'todos'" :key="idx" class="todos-list">
          <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
            <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
            <span class="todo-name">{{ todo.name }}</span>
          </div>
        </div>
        <div v-else-if="item.type === 'chat'" :key="idx" class="flex justify-end">
          <div class="user-question">
            <div v-if="item.mediaFiles && item.mediaFiles.length > 0" class="chat-images">
              <img
                v-for="mf in item.mediaFiles"
                :key="mf.filePath"
                :src="mf.url || mf.dataUrl || mf.filePath"
                class="chat-image-thumb"
              />
            </div>
            <div>{{ item.content }}</div>
          </div>
        </div>
        <div v-else-if="item.type === 'think'" :key="idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
        <div v-else-if="item.type === 'system'" :key="idx" class="system-message" v-html="renderMarkdown(item.content)"></div>
        <template v-else-if="item.type === 'step'" :key="idx">
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

    <div class="test-input-block">
      <div class="test-input-wrapper">
        <ResizableTextarea
          v-model="inputMessage"
          :rows="4"
          placeholder="输入测试要求... (Enter 发送, Ctrl+Enter 换行)"
          :disabled="disabled && !stopping"
          class="test-input-area"
          @keydown.enter.native="handleKeydown"
        />
        <div class="test-input-actions">
          <span :class="disabled ? 'status-thinking' : 'status-ready'">
            <span v-if="disabled" class="thinking-spinner"></span>
            {{ disabled ? '思考中' : '✓ 就绪' }}
          </span>
          <span class="sep">|</span>
          <span>会话: {{ sessionId ? sessionId.slice(0, 8) : '未创建' }}</span>
          <span class="sep">|</span>
          <span>token: {{ promptTokens || 0 }}</span>
          <div class="actions-spacer"></div>
          <button class="action-btn btn-test" @click="fillTestCommand" :disabled="disabled">方案测试</button>
          <button v-if="disabled && !stopping" class="action-btn btn-stop" @click="stopChat">■ 停止</button>
          <button v-else-if="stopping" class="action-btn btn-stop" disabled>停止中...</button>
          <button v-else class="action-btn btn-send" :disabled="!inputMessage.trim()" @click="sendMessage">发送</button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import { ws } from '../../../api/websocket/websocket.js'
import * as sessionsApi from '../../../api/session/session.js'
import * as planCodeApi from '../../../api/plan-code/planCodeApi.js'
import * as configApi from '../../../api/config/config.js'
import { getTodoStatusIcon, formatInput, renderMarkdown, createThinkItem, createStepItem } from '../../../lib/render.js'

export default {
  name: 'PlanCodeTest',
  components: { ResizableTextarea },
  props: {
    visible: { type: Boolean, default: false },
    planFilePath: { type: String, default: '' },
    folderName: { type: String, default: '' },
    modelName: { type: String, default: '' },
  },
  emits: ['update:visible', 'test-session-created'],
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      sessionId: '',
      sessionStatus: 'idle',
      logItems: [],
      wsUnsubscribe: null,
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => this.loadSession())
      } else {
        this.cleanup()
      }
    },
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    getTodoStatusIcon,
    formatInput,
    renderMarkdown,

    async loadSession() {
      if (!this.folderName) return
      try {
        const r = await planCodeApi.getPlanSessionDetail(this.folderName)
        const meta = r.data?.meta || {}
        if (meta.testSessionId) {
          this.sessionId = meta.testSessionId
          await this.loadMessages()
          this.subscribeSession()
        }
      } catch (e) {
        console.error('TestDialog loadSession failed:', e)
      }
    },

    async ensureSession() {
      if (this.sessionId) return this.sessionId
      const r = await sessionsApi.createSession(this.folderName || 'test')
      this.sessionId = r.data.id
      this.$emit('test-session-created', this.sessionId)
      return this.sessionId
    },

    fillTestCommand() {
      if (this.planFilePath) {
        this.inputMessage = `根据 ${this.planFilePath} 方案检查相应功能是否完成。`
      }
    },

    handleKeydown(e) {
      if (e.ctrlKey) {
        const t = e.target
        const s = t.selectionStart
        const end = t.selectionEnd
        this.inputMessage = this.inputMessage.substring(0, s) + '\n' + this.inputMessage.substring(end)
        this.$nextTick(() => { t.selectionStart = t.selectionEnd = s + 1 })
      } else {
        e.preventDefault()
        if (!this.disabled && this.inputMessage.trim()) this.sendMessage()
      }
    },

    async sendMessage() {
      const content = this.inputMessage.trim()
      if (!content || this.disabled) return

      try { await this.ensureSession() } catch { return }
      this.subscribeSession()

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      this.logItems.push({ type: 'chat', content })
      this.scrollToBottom()

      ws.send('chat', {
        message: content,
        sessionId: this.sessionId,
        modelName: this.modelName || undefined,
      })
    },

    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.sessionId })
    },

    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()

      this.wsUnsubscribe = ws.subscribe(this.sessionId, {
        todos: (d) => {
          if (d?.todos) this.logItems.push({ type: 'todos', todos: d.todos })
          this.scrollToBottom()
        },
        step: (d) => {
          this.logItems.push(createStepItem(d))
          if (d?.usage?.promptTokens) this.promptTokens = d.usage.promptTokens
          this.scrollToBottom()
        },
        compact: () => {
          this.loadMessages()
        },
        done: (d) => {
          if (d?.sessionId && this.sessionId && d.sessionId !== this.sessionId) return
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'completed'
          if (d?.modelName) this.$emit('update:modelName', d.modelName)
          if (d?.usage?.promptTokens) this.promptTokens = d.usage.promptTokens
          if (d?.response) this.logItems.push(createThinkItem(d.response))
          this.scrollToBottom()
        },
        stopped: () => {
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.logItems.push(createThinkItem('【已停止】'))
          this.scrollToBottom()
        },
        error: (d) => {
          this.$message.error(d?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
        },
      })
    },

    async loadMessages() {
      if (!this.sessionId) return
      try {
        const r = await sessionsApi.getMessages(this.sessionId)
        this.logItems = (r.data || []).map(i => {
          if (i.type === 'think') return createThinkItem(i.content || '')
          if (i.type === 'step') return createStepItem(i)
          if (i.type === 'chat' && i.mediaFiles) return { type: 'chat', content: i.content, mediaFiles: i.mediaFiles }
          return i
        })
        this.$nextTick(() => this.scrollToBottom(true))
      } catch (e) {
        console.error('TestDialog loadMessages failed:', e)
      }
    },

    scrollToBottom(force = false) {
      const el = this.$refs.messagesContainer
      if (!el) return
      this.$nextTick(() => {
        el.scrollTop = el.scrollHeight
      })
    },

    cleanup() {
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
        this.wsUnsubscribe = null
      }
    },

    handleClose() {
      this.$emit('update:visible', false)
    },

    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    },
  },
}
</script>

<style scoped>
::v-deep .el-dialog { background: var(--color-panelHeader); }
::v-deep .el-dialog__body { background: var(--color-panelHeader); color: var(--color-textMain); padding: 0; }
::v-deep .el-dialog__title { color: var(--color-textMain); }
::v-deep .el-dialog__header { border-bottom: 1px solid var(--color-border); }

.test-chat-messages {
  height: 500px;
  overflow-y: auto;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  border-bottom: 1px solid var(--color-border);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-textMuted);
}
.todos-list { margin-bottom: 16px; color: var(--color-textMain); }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.user-question {
  color: var(--color-accent);
  font-weight: bold;
  border: 1px solid var(--color-accent);
  padding: 15px;
  margin: 15px;
  border-radius: 10px;
  display: inline-block;
  max-width: 80%;
  text-align: left;
}
.ai-thought { color: var(--color-textMain); margin-bottom: 16px; }
.system-message { color: var(--color-textMuted); margin-bottom: 16px; }
.log-mute { color: var(--color-textMuted); margin-bottom: 16px; white-space: pre; }
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: var(--color-accent); margin-left: 8px; }
.build-info { color: var(--color-textMuted); display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.chat-images { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.chat-image-thumb {
  width: 120px; height: 120px; object-fit: cover;
  border-radius: 6px; border: 1px solid var(--color-border);
}

.test-input-block {
  background-color: var(--color-inputBg);
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}
.test-input-wrapper { position: relative; }
.test-input-area { width: 100%; }
.test-input-wrapper ::v-deep .el-textarea__inner {
  padding-bottom: 50px;
}
.test-input-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  z-index: 5;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  color: var(--color-textMuted);
}
.actions-spacer { flex: 1; }
.action-btn { font-size: 12px; padding: 5px 12px; border-radius: 5px; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-test { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-test:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-test:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: var(--color-danger, #ef4444); color: #fff; }
.btn-send { background: var(--color-accent); color: #fff; }
.btn-send:hover { background: #818cf8; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.sep { color: var(--color-border); }
.status-ready { color: var(--color-success, #22c55e); }
.status-thinking { color: var(--color-accent); display: flex; align-items: center; gap: 6px; }
.thinking-spinner { width: 10px; height: 10px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
