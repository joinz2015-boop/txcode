<template>
  <div class="ai-chat">
    <DesktopDesignSessionBar
      :basePath="basePath"
      @session-selected="onSessionSelected"
      @session-created="onSessionCreated"
      @session-deleted="onSessionDeleted"
    />

    <div class="chat-body" ref="chatBody">
      <div v-if="!state.activeSessionId && logItems.length === 0" class="chat-empty">
        <p>请在左侧选择设计页面后开始对话</p>
        <p class="chat-empty-hint">或点击"+"创建新会话</p>
      </div>
      <div v-else-if="logItems.length === 0 && state.activeSessionId" class="chat-empty">
        <p>AI设计助手可协助您分析和优化设计</p>
        <p class="chat-empty-hint">Enter 发送，Ctrl+Enter 换行</p>
      </div>
      <div v-for="(item, idx) in logItems" :key="idx">
        <div v-if="item.type === 'chat'" class="chat-user-row">
          <div class="user-question">
            <div v-if="item.mediaFiles && item.mediaFiles.length > 0" class="chat-images">
              <img
                v-for="mf in item.mediaFiles"
                :key="mf.filePath"
                :src="mf.url || mf.dataUrl || mf.filePath"
                class="chat-image-thumb"
                @click.stop="openImagePreview(mf)"
              />
            </div>
            <div>{{ item.content }}</div>
          </div>
        </div>
        <div v-else-if="item.type === 'think'" class="ai-thought mb-2" v-html="renderMarkdown(item.content)"></div>
        <div v-else-if="item.type === 'system'" class="chat-system-msg" v-html="renderMarkdown(item.content)"></div>
        <div v-else-if="item.type === 'step'">
          <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
          <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
            <template v-if="tc.status === 'executing'">
              <span class="tool-spinner"></span>
              {{ tc.function.name }}
              <span v-if="tc.function.arguments" class="tool-input">{{ formatToolArgs(tc.function.name, tc.function.arguments) }}</span>
            </template>
            <template v-else>
              <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                {{ item.success !== false ? '✓' : '✗' }}
              </span>
              {{ tc.function.name }}
              <span v-if="tc.function.arguments" class="tool-input">{{ formatToolArgs(tc.function.name, tc.function.arguments) }}</span>
            </template>
          </div>
        </div>
        <div v-else class="chat-system-msg">{{ '[未知消息类型' + (item.type ? ': ' + item.type : '') + ']' }}</div>
      </div>
      <div v-if="thinking" class="thinking-indicator">
        <span class="chat-spinner"></span> 思考中...
      </div>
      <div class="build-info" v-if="modelName">
        <span class="icon">▣</span> Build · {{ modelName }}
      </div>
    </div>

    <div class="chat-foot">
      <DesktopDesignImagePreviewList
        v-if="mediaFiles && mediaFiles.length > 0"
        :files="mediaFiles"
        :disabled="disabled"
        @remove="removeMedia"
      />

      <div class="input-panel">
        <div class="input-wrapper">
          <DesktopResizableTextarea
            ref="chatTextarea"
            class="chat-textarea"
            v-model="chatInput"
            :rows="4"
            :minRows="2"
            :maxRows="15"
            placeholder="输入设计需求... (Enter 发送, Ctrl+Enter 换行)"
            :disabled="disabled && !stopping"
            @keydown="handleKeydown"
            @paste-image="handlePasteImages"
          />
          <input
            type="file"
            accept="image/*"
            multiple
            ref="mediaInput"
            style="display:none"
            @change="handleImageSelected"
          />
        </div>
        <div class="input-actions">
          <div class="input-actions-left">
            <span class="status-action" @click="openFileSelect" @mousedown.prevent>选择文件</span>
            <span class="sep">|</span>
            <span class="status-action" @click="openSkillSelect" @mousedown.prevent>选择Skill</span>
            <span class="sep">|</span>
            <span class="status-action" @click="openTemplateSelect" @mousedown.prevent>选择模版</span>
            <span class="sep">|</span>
            <span class="status-action" @click="openCommandDialog" @mousedown.prevent>命令</span>
          </div>
          <div class="input-actions-right">
            <button class="action-btn btn-upload" @click="handleImageUpload" :disabled="disabled">图片</button>
            <button v-if="disabled && !stopping" class="action-btn btn-stop" @click="stopChat">■ 停止</button>
            <button v-else-if="stopping" class="action-btn btn-stop" disabled>停止中...</button>
            <button v-else class="action-btn btn-send" @click="sendMessage" :disabled="!chatInput.trim() && (!mediaFiles || mediaFiles.length === 0)">发送</button>
          </div>
        </div>
      </div>

      <div class="chat-statusbar">
        <span :class="sessionStatus === 'processing' ? 'chat-status-thinking' : 'chat-status-ready'">
          <span v-if="sessionStatus === 'processing'" class="chat-spinner"></span>
          {{ sessionStatus === 'processing' ? ' 思考中' : '✓ 就绪' }}
        </span>
        <span class="sep">|</span>
        <span class="model-selector" @click="openModelSelector" @mousedown.prevent>模型：{{ modelName || '-' }} ▾</span>
        <span class="sep">|</span>
        <span>会话：{{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
        <span class="sep">|</span>
        <span>token：{{ promptTokens || 0 }}</span>
      </div>
    </div>

    <div v-if="previewImage" class="overlay" @click="closeImagePreview">
      <span class="preview-close">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="preview-img" @click.stop />
    </div>

    <DesktopModelSelectDialog
      v-if="modelSelectVisible"
      :currentModel="modelName"
      @close="modelSelectVisible = false"
      @select="onModelSelected"
    />

    <DesktopCommandDialog
      v-if="commandDialogVisible"
      @close="commandDialogVisible = false"
      @select="handleExecuteCommand"
    />

    <DesktopFileSelectDialog
      v-if="fileSelectVisible"
      @close="fileSelectVisible = false"
      @select="onFileSelected"
    />

    <DesktopSkillSelectDialog
      v-if="skillSelectVisible"
      @close="skillSelectVisible = false"
      @select="onSkillSelected"
    />

    <DesktopDesignTemplateSelectDialog
      v-if="templateSelectVisible"
      basePath=".txcode/design"
      @close="templateSelectVisible = false"
      @select="onTemplateSelected"
    />
  </div>
</template>

<script>
import { getItem, setItem } from '@/utils/storage'
import { getFileContent, writeFile, createSession, getSession, getMessages, getConfig, uploadChatImage, browseFilesystem } from '@/api/index'
import { ws } from '@/utils/websocket'
import { marked } from 'marked'
import DesktopModelSelectDialog from '@/components/plan-code/DesktopModelSelectDialog.vue'
import DesktopCommandDialog from '@/components/common/DesktopCommandDialog.vue'
import DesktopFileSelectDialog from '@/components/file/DesktopFileSelectDialog.vue'
import DesktopSkillSelectDialog from '@/components/skill/DesktopSkillSelectDialog.vue'
import DesktopDesignTemplateSelectDialog from './DesktopDesignTemplateSelectDialog.vue'
import DesktopDesignImagePreviewList from './DesktopDesignImagePreviewList.vue'
import DesktopDesignSessionBar from './DesktopDesignSessionBar.vue'
import DesktopResizableTextarea from '@/components/chat/DesktopResizableTextarea.vue'
import { useSession } from './useSession.js'

const DESIGN_BASE = '.txcode/design'
const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default {
  name: 'DesktopDesignAiChat',
  components: {
    DesktopModelSelectDialog,
    DesktopCommandDialog,
    DesktopFileSelectDialog,
    DesktopSkillSelectDialog,
    DesktopDesignTemplateSelectDialog,
    DesktopDesignImagePreviewList,
    DesktopDesignSessionBar,
    DesktopResizableTextarea
  },
  props: {
    currentPage: { type: String, default: '' }
  },
  emit: ['design-updated', 'status-change'],
  setup() {
    const { state, createNewSession: createSessionFn, loadSessions, deleteSession: deleteSessionFn } = useSession()
    return { state, createSessionFn, loadSessions, deleteSessionFn }
  },
  data() {
    return {
      basePath: DESIGN_BASE,
      chatInput: '',
      logItems: [],
      disabled: false,
      stopping: false,
      thinking: false,
      sessionStatus: 'idle',
      modelName: '',
      promptTokens: 0,
      wsUnsubscribe: null,
      requestSeq: 0,
      modelSelectVisible: false,
      commandDialogVisible: false,
      fileSelectVisible: false,
      skillSelectVisible: false,
      templateSelectVisible: false,
      skillCursorPos: -1,
      mediaFiles: [],
      previewImage: null,
      _lastHandledSessionId: null,
    }
  },
  computed: {
    sessionId() {
      if (!this.state.activeSessionId) return ''
      const s = this.state.sessions.find(s => s.id === this.state.activeSessionId)
      return s ? s.sessionId : ''
    }
  },
  watch: {
    currentPage: {
      immediate: true,
      handler(val) {
        this.state.currentPage = val || ''
      }
    },
    'state.activeSessionId'(newId) {
      if (newId && newId !== this._lastHandledSessionId) {
        this.activateSession(newId)
      } else if (!newId) {
        this.deactivateSession()
      }
    }
  },
  activated() {
    this.state.currentPage = this.currentPage || ''
    if (this.state.activeSessionId && this.sessionId) {
      this.subscribeSession()
      this.loadMessages().catch(() => {})
    }
  },
  deactivated() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
      this.wsUnsubscribe = null
    }
  },
  async mounted() {
    await this.loadDefaultModel()
    ws.init()
    await this.loadSessions(this.basePath)
    if (this.state.activeSessionId) {
      this.activateSession(this.state.activeSessionId)
    }
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
      this.wsUnsubscribe = null
    }
  },
  methods: {
    activateSession(sessionId) {
      this._lastHandledSessionId = sessionId
      if (!sessionId) return
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
        this.wsUnsubscribe = null
      }
      this.logItems = []
      this.promptTokens = 0
      this.subscribeSession()
      this.loadMessages().catch(() => {})
    },
    deactivateSession() {
      this._lastHandledSessionId = null
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
        this.wsUnsubscribe = null
      }
      this.logItems = []
      this.promptTokens = 0
    },
    onSessionSelected(session) {
      this.activateSession(session.id)
    },
    onSessionCreated(session) {
      this.activateSession(session.id)
    },
    onSessionDeleted() {
      this.deactivateSession()
    },

    getSessionJsonPath() {
      return DESIGN_BASE + '/session.json'
    },
    async readDesignSessionJson() {
      try {
        const res = await getFileContent(this.getSessionJsonPath())
        if (res && res.data?.content) {
          return JSON.parse(res.data.content)
        }
      } catch (e) {}
      return { pageSessions: {} }
    },
    async writeDesignSessionJson(data) {
      await writeFile(this.getSessionJsonPath(), JSON.stringify(data, null, 2))
    },

    async loadDefaultModel() {
      try {
        const res = await getConfig('defaultModel')
        this.modelName = res.data?.value || ''
      } catch (e) {}
    },

    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await getMessages(this.sessionId)
        const VALID_TYPES = ['chat', 'system', 'step', 'think']
        const rawItems = res.data || []
        this.logItems = rawItems.filter(item => item && VALID_TYPES.includes(item.type))
        this.$nextTick(() => this.scrollToBottom(true))
      } catch (e) {
        this.logItems = []
      }
    },

    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()

      this.wsUnsubscribe = ws.subscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
          this.thinking = isRunning
          this.$emit('status-change', this.sessionStatus)
        },
        step: (data) => {
          const hasExecuting = data.toolCalls?.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this.logItems = this.logItems.filter(
              item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
            )
            this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration, _executing: true })
          } else {
            this.logItems = this.logItems.filter(
              item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
            )
            this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration })
          }
          this.thinking = true
          if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.$nextTick(() => this.scrollToBottom())
        },
        done: (data) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.disabled = false
          this.stopping = false
          this.thinking = false
          this.sessionStatus = 'completed'
          this.$emit('status-change', 'completed')
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.$nextTick(() => this.scrollToBottom())
          this.$emit('design-updated')
        },
        stopped: () => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.disabled = false
          this.stopping = false
          this.thinking = false
          this.sessionStatus = 'idle'
          this.$emit('status-change', 'idle')
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollToBottom())
        },
        error: (data) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          alert(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.thinking = false
          this.sessionStatus = 'idle'
          this.$emit('status-change', 'idle')
        },
        compact: () => {
          this.logItems.push({ type: 'system', content: '【会话已压缩】' })
          this.loadMessages()
        }
      })
    },

    handleKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const textarea = e.target
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          this.chatInput = this.chatInput.substring(0, start) + '\n' + this.chatInput.substring(end)
          this.$nextTick(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1
          })
        } else {
          e.preventDefault()
          this.sendMessage()
        }
      }
    },

    handlePasteImages(files) {
      if (files && files.length > 0) {
        this.uploadFiles(files)
      }
    },

    async sendMessage() {
      const content = this.chatInput.trim()
      const hasMedia = this.mediaFiles && this.mediaFiles.length > 0
      if ((!content && !hasMedia) || this.disabled) return

      if (!this.currentPage || !this.currentPage.endsWith('.html')) {
        alert('请先在左侧选择设计页面')
        return
      }

      if (!this.sessionId) {
        try {
          const session = await this.createSessionFn(this.basePath)
          this.activateSession(session.id)
        } catch (e) {
          alert('创建会话失败: ' + (e.message || e))
          return
        }
      }
      if (!this.sessionId) return

      if (!this.wsUnsubscribe) this.subscribeSession()

      let contextMsg = content
      if (this.currentPage) {
        contextMsg = `当前设计页面：${this.currentPage}\n用户需求：${content}\n请基于以上设计页面路径，对该页面进行设计或修改。`
      }

      const sentMediaFiles = (this.mediaFiles || [])
        .filter(f => !f.uploading && f.filePath)
        .map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))

      this.logItems.push({ type: 'chat', content, mediaFiles: sentMediaFiles })
      this.chatInput = ''
      this.mediaFiles = []
      this.disabled = true
      this.stopping = false
      this.thinking = true
      this.sessionStatus = 'processing'
      this.$emit('status-change', 'processing')

      ws.send('chat', {
        message: contextMsg,
        sessionId: this.sessionId,
        modelName: this.modelName || undefined,
        agent: 'design',
        mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
      })
      this.$nextTick(() => {
        this.scrollToBottom(true)
      })
    },

    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.sessionId })
    },

    scrollToBottom(force = false) {
      const el = this.$refs.chatBody
      if (!el) return
      if (force) {
        el.scrollTop = el.scrollHeight
        return
      }
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      if (dist <= 150) {
        el.scrollTop = el.scrollHeight
      }
    },

    renderMarkdown(content) {
      if (!content) return ''
      try {
        return marked(content, { breaks: true })
      } catch (e) {
        let html = content
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
        html = html.replace(/\n/g, '<br>')
        return html
      }
    },

    formatToolArgs(name, args) {
      try {
        const parsed = typeof args === 'string' ? JSON.parse(args) : args
        if (name === 'bash' || name === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ' (' + parsed.workdir + ')' : '')
        }
        if (name === 'read_file') {
          return parsed.file_path + (parsed.offset ? ':' + parsed.offset : '')
        }
        if (name === 'edit_file' || name === 'write_file') {
          return parsed.file_path || parsed.path || ''
        }
        if (name === 'glob' || name === 'find_files') {
          return parsed.pattern + (parsed.directory ? ' (' + parsed.directory + ')' : '')
        }
        if (name === 'grep' || name === 'search_content') {
          return '"' + parsed.pattern + '"' + (parsed.directory ? ' (' + parsed.directory + ')' : '')
        }
        return JSON.stringify(parsed)
      } catch { return args }
    },

    async uploadFiles(files) {
      const currentCount = (this.mediaFiles || []).length
      const remaining = MAX_IMAGES - currentCount
      if (remaining <= 0) {
        alert('最多上传' + MAX_IMAGES + '张图片')
        return
      }
      const toProcess = Math.min(files.length, remaining)
      if (!this.mediaFiles) this.mediaFiles = []
      const startIdx = this.mediaFiles.length
      for (let i = 0; i < toProcess; i++) {
        const file = files[i]
        if (file.size > MAX_IMAGE_SIZE) {
          alert('图片「' + (file.name || 'paste.png') + '」超过5MB，无法上传')
          continue
        }
        const id = Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2)
        this.mediaFiles.push({
          id, name: file.name || 'paste.png', dataUrl: '', filePath: '',
          type: file.type || 'image/png', uploading: true
        })
      }
      for (let i = 0; i < toProcess; i++) {
        const file = files[i]
        if (file.size > MAX_IMAGE_SIZE) continue
        const idx = startIdx + i
        if (idx >= this.mediaFiles.length) continue
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          const res = await uploadChatImage(file, this.sessionId)
          this.mediaFiles[idx].dataUrl = dataUrl
          this.mediaFiles[idx].filePath = res.data.filePath
          this.mediaFiles[idx].type = res.data.filePath.endsWith('.png') ? 'image/png' : (file.type || 'image/jpeg')
          this.mediaFiles[idx].uploading = false
        } catch (e) {
          alert('图片上传失败: ' + (e.message || e))
          this.mediaFiles.splice(idx, 1)
        }
      }
    },

    handleImageUpload() {
      if (this.disabled) return
      const el = this.$refs.mediaInput
      if (el) {
        if (Array.isArray(el)) el[0]?.click()
        else el.click()
      }
    },

    async handleImageSelected(event) {
      const files = event.target.files
      if (!files || files.length === 0) return
      const fileArray = Array.from(files)
      event.target.value = ''
      await this.uploadFiles(fileArray)
    },

    removeMedia(fileId) {
      if (!this.mediaFiles) return
      const idx = this.mediaFiles.findIndex(f => f.id === fileId)
      if (idx > -1) this.mediaFiles.splice(idx, 1)
    },

    openImagePreview(mf) {
      this.previewImage = mf
    },

    closeImagePreview() {
      this.previewImage = null
    },

    openModelSelector() {
      this.modelSelectVisible = true
    },

    onModelSelected(model) {
      const parts = model.name.split('/')
      this.modelName = parts.length > 2 ? parts.slice(1).join('/') : model.name
    },

    openCommandDialog() {
      this.commandDialogVisible = true
    },

    handleExecuteCommand(cmd) {
      this.chatInput = cmd + ' '
      this.$nextTick(() => {
        const textarea = this.$refs.chatTextarea?.$el?.querySelector('textarea')
        if (textarea) textarea.focus()
      })
    },

    openFileSelect() {
      this.fileSelectVisible = true
    },

    onFileSelected(filePath) {
      const atIndex = this.chatInput.lastIndexOf('@')
      if (atIndex !== -1) {
        this.chatInput = this.chatInput.slice(0, atIndex) + filePath + ' '
      } else {
        this.chatInput += filePath + ' '
      }
      this.fileSelectVisible = false
    },

    openSkillSelect() {
      const textarea = this.$refs.chatTextarea?.$el?.querySelector('textarea')
      this.skillCursorPos = textarea ? textarea.selectionStart : -1
      this.skillSelectVisible = true
    },

    onSkillSelected(skillName) {
      const tag = `[${skillName}] `
      const pos = this.skillCursorPos >= 0 ? this.skillCursorPos : 0
      this.chatInput = this.chatInput.slice(0, pos) + tag + this.chatInput.slice(pos)
      this.skillSelectVisible = false
    },

    openTemplateSelect() {
      const textarea = this.$refs.chatTextarea?.$el?.querySelector('textarea')
      this.skillCursorPos = textarea ? textarea.selectionStart : -1
      this.templateSelectVisible = true
    },

    onTemplateSelected(templatePath) {
      const tag = `【设计基础模版】${templatePath} `
      const pos = this.skillCursorPos >= 0 ? this.skillCursorPos : 0
      this.chatInput = this.chatInput.slice(0, pos) + tag + this.chatInput.slice(pos)
      this.templateSelectVisible = false
    }
  }
}
</script>

<style scoped>
.ai-chat { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

.chat-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.chat-body::-webkit-scrollbar { width: 6px; }
.chat-body::-webkit-scrollbar-track { background: transparent; }
.chat-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.chat-body::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.chat-empty { text-align: center; color: var(--text-muted); padding: 30px 10px; font-size: 13px; }
.chat-empty-hint { font-size: 11px; margin-top: 4px; }

.chat-user-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.user-question {
  color: var(--accent);
  font-weight: bold;
  border: 1px solid var(--accent);
  padding: 10px 15px;
  border-radius: 10px;
  display: inline-block;
  max-width: 80%;
  text-align: left;
  font-size: 13.5px;
}

.chat-images { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.chat-image-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); cursor: zoom-in; transition: border-color 0.2s; }
.chat-image-thumb:hover { border-color: var(--accent); }

.ai-thought {
  color: var(--text-primary);
  margin-bottom: 10px;
  line-height: 1.6;
  font-size: 12.5px;
}
.ai-thought :deep(p) { margin: 4px 0; }

.chat-system-msg { font-size: 11px; color: var(--text-muted); text-align: center; padding: 4px 0; margin-bottom: 10px; }

.log-mute {
  color: var(--text-muted);
  margin-bottom: 10px;
  white-space: pre;
  font-size: 12px;
}
.tool-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 3px;
}
.tool-success { color: #22c55e; font-weight: 600; }
.tool-fail { color: #ef4444; font-weight: 600; }
.tool-input { color: var(--accent); margin-left: 6px; font-size: 11.5px; }

.thinking-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--accent); padding: 4px 0; }

.build-info {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}

.chat-foot { border-top: 1px solid var(--border); flex-shrink: 0; }

.input-panel {
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
  margin: 10px;
}
.input-panel:focus-within { border-color: var(--accent); }

.input-wrapper { position: relative; }

.chat-textarea {
  width: 100%;
  border: none;
  outline: none;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  gap: 6px;
  border-top: 1px solid var(--border);
}
.input-actions-left { display: flex; align-items: center; gap: 4px; }
.input-actions-right { display: flex; align-items: center; gap: 6px; }

.status-action { cursor: pointer; font-size: 11px; color: var(--text-muted); user-select: none; }
.status-action:hover { color: var(--accent); }
.sep { color: var(--border); font-size: 11px; }

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

.chat-statusbar { display: flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 10.5px; color: var(--text-muted); border-top: 1px solid var(--border); flex-shrink: 0; background: var(--bg-titlebar); }
.chat-status-ready { color: var(--green); }
.chat-status-thinking { color: var(--accent); }
.model-selector { cursor: pointer; }
.model-selector:hover { color: var(--accent); }
.chat-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.preview-close { position: absolute; top: 16px; right: 16px; color: #fff; font-size: 28px; cursor: pointer; z-index: 1; }
.preview-img { max-width: 90vw; max-height: 90vh; }
</style>
