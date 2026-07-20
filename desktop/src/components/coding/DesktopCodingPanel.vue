<template>
  <div class="coding-panel">
    <div class="panel-header">
      <span># {{ sessionTitle }}</span>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="logItems.length === 0" class="chat-empty">
        <span class="chat-empty-icon">&#x1F4AC;</span>
        <p>{{ currentSession && !panel.sessionId ? '发送第一条消息后将自动创建编码会话' : '开始对话吧！输入您的问题...' }}</p>
      </div>
      <template v-for="(item, idx) in logItems">
        <div v-if="item.type === 'todos'" :key="'ml-' + idx" class="todos-list">
          <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
            <span class="todo-status">{{ getTodoStatusIcon(todo) }}</span>
            <span class="todo-name">{{ todo.name || todo.text || todo }}</span>
          </div>
        </div>
        <div v-else-if="item.type === 'chat'" :key="'ml-' + idx" class="flex justify-end">
          <div class="user-question">
            <div v-if="item.mediaFiles && item.mediaFiles.length" class="chat-images">
              <img v-for="mf in item.mediaFiles" :key="mf.filePath || mf.id" :src="mf.url || mf.dataUrl || mf.filePath" class="chat-image-thumb" @click.stop="$emit('preview-image', mf)" />
            </div>
            <div>{{ item.content }}</div>
          </div>
        </div>
        <div v-else-if="item.type === 'think'" :key="'ml-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
        <div v-else-if="item.type === 'step'" :key="'ml-' + idx">
          <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
          <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
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
        </div>
        <div v-else-if="item.type === 'system'" :key="'ml-' + idx" class="system-msg">{{ item.content }}</div>
      </template>
      <div v-if="disabled && !stopping" class="typing-indicator">
        <span class="typing-dot">●</span>
        <span class="typing-dot">●</span>
        <span class="typing-dot">●</span>
      </div>
      <div class="build-info" v-if="panel.modelName || currentModel">
        <span class="icon">▣</span> Build · {{ panel.modelName || currentModel }}
      </div>
    </div>
    <div class="input-block">
      <DesktopImagePreviewList
        v-if="mediaFiles.length > 0"
        :files="mediaFiles"
        :disabled="disabled"
        @remove="removeMedia"
      />
      <div class="input-wrapper">
        <DesktopResizableTextarea
          v-model="inputText"
          :rows="4"
          :minRows="2"
          :maxRows="20"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行，可粘贴图片)"
          :disabled="disabled"
          class="code-textarea"
          @keydown="handleKeydown"
          @paste-image="handlePasteImages"
        />
        <input ref="imageInput" type="file" accept="image/*" multiple style="display:none" @change="handleImageFiles" />
        <div class="input-actions">
          <span :class="disabled ? 'status-thinking' : 'status-ready'">
            <span v-if="disabled && !stopping" class="thinking-spinner"></span>
            {{ disabled ? (stopping ? '■ 停止中' : '思考中') : '✓ 就绪' }}
          </span>
          <span class="sep">|</span>
          <span class="status-action" @click="openModelSelect" @mousedown.prevent>模型: {{ panel.modelName || currentModel }} ▾</span>
          <span class="sep">|</span>
          <span>会话: {{ sessionIdDisplay }}</span>
          <span class="sep">|</span>
          <span>token: {{ panel.promptTokens }}</span>
          <span class="sep">|</span>
          <span class="status-action" @click="showCommandDialog = true" @mousedown.prevent>命令</span>
          <span class="sep">|</span>
          <span class="status-action" @click="showFileDialog = true" @mousedown.prevent>选择文件</span>
          <span class="sep">|</span>
          <span class="status-action" @click="showSkillDialog = true" @mousedown.prevent>选择Skill</span>
          <span class="sep">|</span>
          <span class="status-action" @click="showDesignDialog = true" @mousedown.prevent>选择设计</span>
          <span class="sep">|</span>
          <template v-for="(action, aIdx) in customActions">
            <span class="status-action" :key="'ca-' + aIdx" @click="executeCustomAction(action)" @mousedown.prevent :title="action.prompt">{{ action.name }}</span>
            <span class="sep" :key="'cas-' + aIdx">|</span>
          </template>
          <span class="status-action" @click="handleTest" @mousedown.prevent>测试</span>
          <span class="sep">|</span>
          <span class="status-action" @click="handleGitChanges" @mousedown.prevent>git变更</span>
          <div class="actions-spacer"></div>
          <button class="action-btn btn-upload" @click="triggerImageUpload" :disabled="disabled">图片</button>
          <button v-if="disabled && !stopping" class="action-btn btn-stop" @click="stopSending">■ 停止</button>
          <button v-else-if="stopping" class="action-btn btn-stop" disabled>停止中...</button>
          <button v-else class="action-btn btn-send" @click="sendMessage" :disabled="!canSend">发送</button>
        </div>
      </div>
    </div>

    <DesktopFileSelectDialog v-if="showFileDialog" @close="showFileDialog = false" @select="onFileSelected" />
    <DesktopSkillSelectDialog v-if="showSkillDialog" @close="showSkillDialog = false" @select="onSkillSelected" />
    <DesktopDesignSelectDialog v-if="showDesignDialog" @close="showDesignDialog = false" @select="onDesignSelected" />
    <DesktopCommandDialog v-if="showCommandDialog" @close="showCommandDialog = false" @select="onCommandSelected" />
  </div>
</template>

<script>
import DesktopFileSelectDialog from '@/components/file/DesktopFileSelectDialog.vue'
import DesktopSkillSelectDialog from '@/components/skill/DesktopSkillSelectDialog.vue'
import DesktopDesignSelectDialog from '@/components/design/DesktopDesignSelectDialog.vue'
import DesktopCommandDialog from '@/components/common/DesktopCommandDialog.vue'
import DesktopImagePreviewList from '@/components/chat/DesktopImagePreviewList.vue'
import DesktopResizableTextarea from '@/components/chat/DesktopResizableTextarea.vue'
import { getItem, setItem } from '@/utils/storage'
import { createSession, getMessages } from '@/api/index'
import { saveMeta } from '@/api/index'
import { uploadChatImage } from '@/api/index'
import { ws } from '@/utils/websocket'
import { marked } from 'marked'

let logSeq = 0
let mediaIdCounter = 0

export default {
  name: 'DesktopCodingPanel',
  components: {
    DesktopFileSelectDialog,
    DesktopSkillSelectDialog,
    DesktopDesignSelectDialog,
    DesktopCommandDialog,
    DesktopImagePreviewList,
    DesktopResizableTextarea
  },
  props: {
    currentAgent: { type: String, default: 'Code Agent' },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null },
    runningSessionIds: { type: Array, default: () => [] },
    planFilePath: { type: String, default: '' },
    customActions: { type: Array, default: () => [] }
  },
  emits: ['open-model-select', 'custom-action', 'open-git-changes', 'open-test', 'preview-image'],
  data() {
    return {
      inputText: '',
      panel: this.createPanel(),
      stopping: false,
      showFileDialog: false,
      showSkillDialog: false,
      showDesignDialog: false,
      showCommandDialog: false,
      mediaFiles: []
    }
  },
  computed: {
    logItems() {
      return this.panel.logItems
    },
    disabled() {
      return this.panel.disabled
    },
    canSend() {
      return this.inputText.trim() || (this.mediaFiles || []).filter(f => !f.uploading).length > 0
    },
    sessionTitle() {
      if (this.currentSession) {
        return this.currentSession.meta.sessionName || this.currentSession.folderName || 'AI 编码对话'
      }
      return 'AI 编码对话'
    },
    sessionIdDisplay() {
      return this.panel.sessionId ? this.panel.sessionId.substring(0, 8) : '未创建'
    }
  },
  watch: {
    currentSession: {
      handler(val, oldVal) {
        if (!val) {
          this.unsubscribePanel()
          this.panel = this.createPanel()
          return
        }
        if (oldVal && oldVal.folderName === val.folderName) return
        this.initSession(val)
      },
      immediate: true
    },
    runningSessionIds(ids) {
      if (this.panel.sessionId && ids.includes(this.panel.sessionId)) {
        this.panel.disabled = true
      } else {
        this.panel.disabled = false
      }
    }
  },
  methods: {
    createPanel() {
      return {
        sessionId: null,
        logItems: [],
        disabled: false,
        modelName: '',
        promptTokens: 0,
        wsUnsubscribe: null
      }
    },

    async initSession(session) {
      this.saveCodeScrollTop()
      this.unsubscribePanel()
      this.panel = this.createPanel()

      const meta = session.meta || {}
      if (meta.codeSessionId) {
        this.panel.sessionId = meta.codeSessionId
        await this.loadMessages(meta.codeSessionId)
        this.subscribePanel(meta.codeSessionId)
      }
      if (this.currentModel) {
        this.panel.modelName = this.currentModel
      }
      this.$nextTick(() => this.restoreCodeScrollTop())
    },

    saveCodeScrollTop() {
      const el = this.$refs.messagesContainer
      if (el) {
        const key = this.currentSession ? `coding:scrollTop:${this.currentSession.folderName}` : 'coding:scrollTop'
        setItem(key, el.scrollTop)
      }
    },

    restoreCodeScrollTop() {
      const el = this.$refs.messagesContainer
      if (el) {
        const key = this.currentSession ? `coding:scrollTop:${this.currentSession.folderName}` : 'coding:scrollTop'
        const top = getItem(key, 0)
        if (top > 0) {
          this.$nextTick(() => { el.scrollTop = top })
        }
      }
    },

    unsubscribePanel() {
      if (this.panel.wsUnsubscribe) {
        this.panel.wsUnsubscribe()
        this.panel.wsUnsubscribe = null
      }
    },

    async ensureCodeSession() {
      let sid = this.panel.sessionId
      if (!sid) {
        const sessionName = this.currentSession ? (this.currentSession.meta.sessionName || this.currentSession.folderName) : '新会话'
        const r = await createSession(sessionName)
        sid = r.data.id
        this.panel.sessionId = sid

        if (this.currentSession) {
          const meta = { ...this.currentSession.meta, codeSessionId: sid, updatedAt: new Date().toISOString() }
          await saveMeta(this.currentSession.folderName, meta)
          this.currentSession.meta = meta
          setItem('planSession:current', this.currentSession)
        }
      }
      return sid
    },

    subscribePanel(sessionId) {
      if (!sessionId) return
      if (this.panel.wsUnsubscribe) this.panel.wsUnsubscribe()

      this.panel.wsUnsubscribe = ws.subscribe(sessionId, {
        step: (d) => {
          const hasExecuting = d.toolCalls && d.toolCalls.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this.panel.logItems = this.panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.panel.logItems.push(this.withLogId({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration, _executing: true }))
          } else {
            this.panel.logItems = this.panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.pushLogItem({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration })
          }
          if (d.usage && d.usage.promptTokens) this.panel.promptTokens = d.usage.promptTokens
          this.$nextTick(() => this.scrollToBottom())
        },
        done: (d) => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          if (d.modelName) this.panel.modelName = d.modelName
          if (d.usage && d.usage.promptTokens) this.panel.promptTokens = d.usage.promptTokens
          if (d.response) {
            this.pushLogItem({ type: 'think', content: d.response })
            this.$nextTick(() => this.scrollToBottom())
          }
        },
        stopped: () => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          this.pushLogItem({ type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollToBottom())
        },
        error: (d) => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          alert(d.error || '发生错误')
        },
        todos: (d) => {
          this.pushLogItem({ type: 'todos', todos: d.todos })
          this.$nextTick(() => this.scrollToBottom())
        },
        compact: () => {
          if (this.panel.sessionId) this.loadMessages(this.panel.sessionId)
        },
        running_sessions: (d) => {
          const runningIds = d.runningSessionIds || []
          if (this.panel.sessionId && runningIds.includes(this.panel.sessionId)) {
            this.panel.disabled = true
          } else {
            this.panel.disabled = false
          }
        }
      })
    },

    async loadMessages(sessionId) {
      try {
        const r = await getMessages(sessionId)
        this.panel.logItems = (r.data || []).map(i => {
          if (i.type === 'think') return this.withLogId({ type: 'think', content: i.content || '' })
          if (i.type === 'step') return this.withLogId(i)
          return this.withLogId(i)
        })
      } catch (e) {
        this.panel.logItems = []
      }
      this.$nextTick(() => this.scrollToBottom())
    },

    pushLogItem(item) {
      this.panel.logItems.push(this.withLogId(item))
      const max = 400
      if (this.panel.logItems.length > max) {
        this.panel.logItems.splice(0, this.panel.logItems.length - max)
      }
    },

    withLogId(item) {
      return { ...item, logId: ++logSeq }
    },

    open(data) {
      if (data && data.sessionId) {
        this.unsubscribePanel()
        this.panel = this.createPanel()
        this.panel.sessionId = data.sessionId
        this.subscribePanel(data.sessionId)
        this.loadMessages(data.sessionId)
      }
    },

    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },

    async sendMessage() {
      const text = this.inputText.trim()
      const hasMedia = this.mediaFiles.filter(f => !f.uploading).length > 0
      if ((!text && !hasMedia) || this.disabled) return
      try {
        await this.ensureCodeSession()
      } catch (e) { return }
      this.subscribePanel(this.panel.sessionId)
      const payload = {
        message: text,
        sessionId: this.panel.sessionId,
        modelName: this.panel.modelName || this.currentModel || undefined,
        agent: 'code',
      }
      if (this.planFilePath) {
        payload.planFilePath = this.planFilePath
      }
      this.inputText = ''
      this.panel.disabled = true
      this.stopping = false
      this.pushLogItem({ type: 'chat', content: text })
      this.$nextTick(() => this.scrollToBottom())
      ws.send('chat', payload)
      this.mediaFiles = []
      const session = this.currentSession
      if (session && session.meta && session.meta.sessionName === '新计划会话') {
        ws.send('name_session', { sessionId: this.panel.sessionId, folderName: session.folderName, userInput: text })
      }
    },

    handlePasteImages(files) {
      if (!files) return
      for (const file of files) {
        this.processMediaFile(file)
      }
    },

    triggerImageUpload() {
      this.$refs.imageInput && this.$refs.imageInput.click()
    },

    handleImageFiles(e) {
      const files = e.target.files
      if (!files) return
      for (const file of files) {
        this.processMediaFile(file)
      }
      e.target.value = ''
    },

    processMediaFile(file) {
      if (!file.type.startsWith('image/')) return
      const id = 'media_' + (++mediaIdCounter)
      const reader = new FileReader()
      reader.onload = () => {
        this.mediaFiles.push({ id, file, dataUrl: reader.result, uploading: false })
      }
      reader.readAsDataURL(file)
    },

    async uploadMediaAndGetUrls() {
      const sessionId = this.panel.sessionId
      if (!sessionId || this.mediaFiles.length === 0) return []
      const results = []
      for (const mf of this.mediaFiles) {
        if (mf.uploading) continue
        mf.uploading = true
        try {
          const r = await uploadChatImage(mf.file, sessionId)
          if (r.data && r.data.url) results.push(r.data.url)
        } catch (e) {
          console.error('图片上传失败:', e)
        } finally {
          mf.uploading = false
        }
      }
      return results
    },

    removeMedia(id) {
      this.mediaFiles = this.mediaFiles.filter(m => m.id !== id)
    },

    onFileSelected(path) {
      this.inputText = this.inputText + path + ' '
      this.showFileDialog = false
    },

    onSkillSelected(name) {
      this.inputText = '[Skill:' + name + '] ' + this.inputText
      this.showSkillDialog = false
    },

    onDesignSelected(path) {
      this.inputText += '[设计:' + path + '] '
      this.showDesignDialog = false
    },

    onCommandSelected(cmd) {
      this.inputText = cmd + ' ' + this.inputText
      this.showCommandDialog = false
    },

    handleTest() {
      this.$emit('open-test')
    },

    handleGitChanges() {
      this.$emit('open-git-changes')
    },

    openModelSelect() {
      this.$emit('open-model-select')
    },

    executeCustomAction(action) {
      this.$emit('custom-action', action)
    },

    stopSending() {
      if (!this.panel.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.panel.sessionId })
    },

    renderMarkdown(text) {
      if (!text) return ''
      try {
        return marked.parse(text)
      } catch {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      }
    },

    getTodoStatusIcon(todo) {
      const status = todo.status || (todo.completed ? 'completed' : 'pending')
      const icons = { completed: '✓', in_progress: '◉', pending: '○', cancelled: '✗' }
      return icons[status] || '○'
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

    scrollToBottom() {
      const el = this.$refs.messagesContainer
      if (el) {
        this.$nextTick(() => {
          el.scrollTop = el.scrollHeight
        })
      }
    }
  }
}
</script>

<style scoped>
.coding-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  background: var(--bg-chat);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 40px 24px;
  font-size: 14px;
  line-height: 1.6;
}
.chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  flex-direction: column;
  gap: 12px;
}
.chat-empty-icon {
  font-size: 48px;
  opacity: 0.3;
}

.user-question {
  color: var(--accent);
  font-weight: 600;
  border: 1px solid var(--accent);
  padding: 12px 16px;
  margin: 12px 0 12px auto;
  border-radius: 10px;
  display: inline-block;
  max-width: 70%;
  word-break: break-word;
}
.ai-thought {
  color: var(--text-primary);
  margin-bottom: 16px;
  line-height: 1.6;
}
.ai-thought :deep(p) { margin: 4px 0; }
.ai-thought :deep(pre) {
  background: #f1f2f6;
  border-radius: 4px;
  padding: 8px 12px;
  overflow-x: auto;
  font-size: 12px;
  margin: 6px 0;
}
.ai-thought :deep(code) {
  background: #f1f2f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.log-mute {
  color: var(--text-muted);
  margin-bottom: 12px;
  font-size: 13px;
}
.tool-success { color: #22c55e; font-weight: 600; }
.tool-fail { color: #ef4444; font-weight: 600; }
.tool-input { color: var(--accent); margin-left: 6px; font-size: 12px; }

.todos-list { margin-bottom: 16px; color: var(--text-primary); }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 13px; }
.todo-status { flex-shrink: 0; }
.todo-name { color: var(--text-secondary); }

.system-msg {
  color: var(--text-muted);
  margin-bottom: 12px;
  font-size: 13px;
  font-style: italic;
}

.chat-images { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.chat-image-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; }

.typing-indicator {
  padding: 8px 0;
}
.typing-dot {
  animation: typing 1.4s ease-in-out infinite;
  color: var(--accent);
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; }
}

.build-info {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
}
.build-info .icon { color: var(--accent); font-size: 11px; }

.justify-end { display: flex; justify-content: flex-end; }

/* Input */
.input-block {
  background: var(--bg-input);
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.input-wrapper {
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.code-textarea {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  line-height: 1.5;
  background: transparent;
  min-height: 64px;
}
.code-textarea:disabled {
  opacity: 0.7;
  background: #f9fafb;
}
.code-textarea::placeholder {
  color: var(--text-muted);
}
.input-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-top: 1px solid var(--border);
}

.sep { color: var(--border); user-select: none; }
.status-ready { color: #22c55e; font-weight: 500; }
.status-thinking { color: var(--accent); display: flex; align-items: center; gap: 6px; font-weight: 500; }
.status-action { cursor: pointer; }
.status-action:hover { color: var(--accent); }
.thinking-spinner {
  width: 10px; height: 10px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.actions-spacer { flex: 1; }

.action-btn {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-upload {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
}
.btn-upload:hover { border-color: var(--accent); color: var(--accent); }
.btn-upload:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: #ef4444; color: #fff; }
.btn-stop:hover { background: #dc2626; }
.btn-stop:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-send { background: var(--accent); color: #fff; }
.btn-send:hover { background: #6366f1; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

.tool-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}
</style>
