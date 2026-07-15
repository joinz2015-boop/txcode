<template>
    <div class="flex flex-col flex-1 min-h-0">
    <div class="chat-messages flex-1 overflow-y-auto px-3 py-2 min-h-0" ref="messagesContainer">
      <div v-if="!logItems.length" class="empty-state">
        <i class="fa-solid fa-robot text-4xl mb-3 opacity-20 block text-center"></i>
        <p class="text-sm text-textMuted text-center">AI设计助手可协助您分析和优化设计</p>
        <p class="text-xs text-textMuted text-center mt-1">Enter 发送，Ctrl+Enter 换行</p>
      </div>
      <template v-for="(item, idx) in logItems">
        <div v-if="item.type === 'chat'" :key="idx" class="flex justify-end mb-3">
          <div class="user-question">
            <div v-if="item.mediaFiles && item.mediaFiles.length > 0" class="chat-images mb-1">
              <img
                v-for="mf in item.mediaFiles"
                :key="mf.filePath"
                :src="mf.url || mf.dataUrl || mf.filePath"
                class="chat-image-thumb"
                @click.stop="openImagePreview(mf)"
              />
            </div>
            <div class="text-sm">{{ item.content }}</div>
          </div>
        </div>
        <div v-else-if="item.type === 'system'" :key="idx" class="system-message mb-2" v-html="renderMarkdown(item.content)"></div>
        <template v-else-if="item.type === 'step'" :key="idx">
          <div v-if="item.thought" class="ai-thought mb-2" v-html="renderMarkdown(item.thought)"></div>
          <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute text-xs text-textMuted mb-1">
            <template v-if="tc.status === 'executing'">
              <span class="tool-spinner"></span>
              {{ tc.function.name }}
              <span v-if="tc.function.arguments" class="tool-input">{{ formatInput(tc.function.name, tc.function.arguments) }}</span>
            </template>
            <template v-else>
              <span :class="item.success !== false ? 'text-green-400' : 'text-red-400'">
                {{ item.success !== false ? '✓' : '✗' }}
              </span>
              {{ tc.function.name }}
              <span v-if="tc.function.arguments" class="tool-input">{{ formatInput(tc.function.name, tc.function.arguments) }}</span>
            </template>
          </div>
        </template>
        <div v-else-if="item.type === 'think'" :key="idx" class="ai-thought mb-2" v-html="renderMarkdown(item.content)"></div>
        <div v-else :key="idx" class="log-mute text-xs text-textMuted mb-1">
          [未知消息类型{{ item.type ? ': ' + item.type : '' }}]
        </div>
      </template>
      <div class="build-info" v-if="modelName">
        <span class="icon">▣</span> Build · {{ modelName }}
      </div>
    </div>

    <div class="chat-input-area flex-shrink-0">
      <ImagePreviewList
        v-if="mediaFiles && mediaFiles.length > 0"
        :files="mediaFiles"
        :disabled="disabled"
        @remove="removeMedia"
      />
      <div class="input-panel">
        <div class="input-wrapper">
          <ResizableTextarea
            v-model="inputMessage"
            :rows="5"
            placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
            :disabled="disabled && !stopping"
            class="input-area"
            @keydown.enter.native="handleKeydown"
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
            <span class="separator">|</span>
            <span class="status-action" @click="openSkillSelect" @mousedown.prevent>选择Skill</span>
            <span class="separator">|</span>
            <span class="status-action" @click="openTemplateSelect" @mousedown.prevent>选择模版</span>
            <span class="separator">|</span>
            <span class="status-action" @click="openCommandDialog" @mousedown.prevent>命令</span>
          </div>
          <div class="input-actions-right">
            <el-button @click="handleImageUpload" :disabled="disabled" class="upload-btn" size="small">图片</el-button>
            <el-button v-if="disabled && !stopping" type="danger" @click="stopChat" class="stop-btn" size="small">
              ■ 停止
            </el-button>
            <el-button v-else-if="stopping" type="info" disabled class="stop-btn" size="small">
              停止中...
            </el-button>
            <el-button v-else type="primary" :disabled="!inputMessage.trim() && (!mediaFiles || mediaFiles.length === 0)" @click="sendMessage" class="send-btn" size="small">
              发送
            </el-button>
          </div>
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
      </div>
    </div>

    <div v-if="previewImage" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" @click="closeImagePreview">
      <span class="absolute top-4 right-4 text-white text-2xl cursor-pointer">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="max-w-[90vw] max-h-[90vh]" @click.stop />
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

    <SkillSelectDialog
      :visible.sync="skillSelectVisible"
      @select="onSkillSelected"
      @close="cancelSkillSelect"
    />

    <TemplateSelectDialog
      :visible.sync="templateSelectVisible"
      base-path=".txcode/design"
      @select="onTemplateSelected"
    />
  </div>
</template>

<script>
import { api } from '../../../api/index.js'
import { marked } from 'marked'
import ModelSelectDialog from '../model/ModelSelectDialog.vue'
import CommandDialog from '../common/CommandDialog.vue'
import FileSelectDialog from '../file/FileSelectDialog.vue'
import SkillSelectDialog from '../skill/SkillSelectDialog.vue'
import TemplateSelectDialog from './TemplateSelectDialog.vue'
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import ImagePreviewList from '../chat/ImagePreviewList.vue'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'
import { mediaChatMixin } from '../../../lib/mediaChat.js'

export default {
  name: 'DesignAiChat',
  components: { ModelSelectDialog, CommandDialog, FileSelectDialog, SkillSelectDialog, TemplateSelectDialog, ImagePreviewList, ResizableTextarea },
  mixins: [mediaChatMixin()],
  props: {
    basePath: { type: String, default: '.txcode/design' },
    currentPage: { type: String, default: '' }
  },
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      logItems: [],
      modelName: '',
      modelSelectVisible: false,
      commandDialogVisible: false,
      fileSelectVisible: false,
      skillSelectVisible: false,
      templateSelectVisible: false,
      skillCursorPos: -1,
      sessionId: '',
      sessionStatus: 'idle',
      wsUnsubscribe: null,
      requestSeq: 0
    }
  },
  watch: {
    currentPage: {
      immediate: false,
      handler(newVal) {
        this.loadSessionForPage(newVal)
      }
    }
  },
  async mounted() {
    await this.loadDefaultModel()
    api.ws.init()
    if (this.currentPage) {
      await this.loadSessionForPage(this.currentPage)
    }
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) this.wsUnsubscribe()
  },
  methods: {
    getSessionJsonPath() {
      return this.basePath + '/session.json'
    },
    async readSessionJson() {
      try {
        const res = await api.getFileContent(this.getSessionJsonPath())
        if (res && res.data?.content) {
          const data = JSON.parse(res.data.content)
          if (data.pageSessions) {
            const cleaned = {}
            for (const [key, val] of Object.entries(data.pageSessions)) {
              if (key.endsWith('.html') && key !== 'session.json') {
                cleaned[key] = val
              }
            }
            if (Object.keys(cleaned).length !== Object.keys(data.pageSessions).length) {
              data.pageSessions = cleaned
              this.writeSessionJson(data).catch(() => {})
            }
          }
          return data
        }
      } catch (e) {
      }
      return { pageSessions: {} }
    },
    async writeSessionJson(data) {
      await api.writeFile(this.getSessionJsonPath(), JSON.stringify(data, null, 2))
    },
    async loadSessionForPage(pagePath) {
      const seq = ++this.requestSeq
      console.log('[DesignAiChat] loadSessionForPage called:', pagePath, 'seq:', seq)
      const t0 = performance.now()
      if (!pagePath || !pagePath.endsWith('.html')) {
        if (this.wsUnsubscribe) { this.wsUnsubscribe(); this.wsUnsubscribe = null }
        this.sessionId = ''
        this.logItems = []
        this.promptTokens = 0
        this.sessionStatus = 'idle'
        this.$emit('status-change', 'idle')
        console.log('[DesignAiChat] loadSessionForPage skipped (not html):', pagePath)
        return
      }

      const sessionData = await this.readSessionJson()
      if (this.requestSeq !== seq) return
      console.log('[DesignAiChat] sessionData loaded:', Object.keys(sessionData.pageSessions || {}))
      const pageSession = sessionData.pageSessions?.[pagePath]
      console.log('[DesignAiChat] pageSession for', pagePath, ':', !!pageSession)

      if (pageSession?.sessionId) {
        try {
          console.log('[DesignAiChat] loading existing session:', pageSession.sessionId)
          const t1 = performance.now()
          const sessionRes = await api.getSession(pageSession.sessionId)
          if (this.requestSeq !== seq) return
          console.log('[DesignAiChat] getSession took:', (performance.now() - t1).toFixed(1), 'ms')
          if (sessionRes && sessionRes.data) {
            this.sessionId = pageSession.sessionId
            this.subscribeSession()
            const t2 = performance.now()
            await this.loadMessages()
            if (this.requestSeq !== seq) return
            console.log('[DesignAiChat] loadMessages took:', (performance.now() - t2).toFixed(1), 'ms')
            console.log('[DesignAiChat] loadSessionForPage done (existing), total:', (performance.now() - t0).toFixed(1), 'ms')
            return
          }
        } catch (e) {
          console.error('[DesignAiChat] getSession failed:', e)
        }
      }

      try {
        console.log('[DesignAiChat] creating new session for:', pagePath)
        const res = await api.createSession(`设计页面: ${pagePath}`)
        if (this.requestSeq !== seq) return
        this.sessionId = res.data.id
        sessionData.pageSessions[pagePath] = { sessionId: this.sessionId }
        await this.writeSessionJson(sessionData)
        if (this.requestSeq !== seq) return
        this.logItems = []
        this.promptTokens = 0
        this.subscribeSession()
        console.log('[DesignAiChat] loadSessionForPage done (new), total:', (performance.now() - t0).toFixed(1), 'ms')
      } catch (e) {
        console.error('Create session failed:', e)
      }
    },
    async loadDefaultModel() {
      try {
        const res = await api.getConfig('defaultModel')
        this.modelName = res.data?.value || ''
      } catch (e) { console.error('Load model failed:', e) }
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        const VALID_TYPES = ['chat', 'system', 'step', 'think']
        const rawItems = res.data || []
        this.logItems = rawItems.filter(item => item && VALID_TYPES.includes(item.type))
        this.$nextTick(() => this.scrollChatToBottom(true))
      } catch (e) { console.error('Load messages failed:', e) }
    },
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
    async sendMessage() {
      const content = this.inputMessage.trim()
      const hasMedia = this.mediaFiles && this.mediaFiles.length > 0
      if ((!content && !hasMedia) || this.disabled) return

      if (!this.sessionId) {
        this.$message.error('请在左侧选择设计页面')
        return
      }

      if (!this.wsUnsubscribe) this.subscribeSession()

      let contextMsg = content
      if (this.currentPage) {
        contextMsg = `当前设计页面：${this.currentPage}\n用户需求：${content}\n请基于以上设计页面路径，对该页面进行设计或修改。`
      }

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      const sentMediaFiles = (this.mediaFiles || [])
        .filter(f => !f.uploading && f.filePath)
        .map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))
      this.logItems.push({ type: 'chat', content, mediaFiles: sentMediaFiles })
      this.scrollChatToBottom(true)

      api.sessionWsSend(this.sessionId, 'chat', {
        message: contextMsg,
        sessionId: this.sessionId,
        modelName: this.modelName || undefined,
        agent: 'design',
        mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
      })
      this.mediaFiles = []
    },
    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      api.sessionWsSend(this.sessionId, 'stop', { sessionId: this.sessionId })
    },
    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()

      this.wsUnsubscribe = api.wsSubscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
          this.$emit('status-change', this.sessionStatus)
        },
        step: (data) => {
          const hasExecuting = data.toolCalls?.some(tc => tc.status === 'executing');
          if (hasExecuting) {
            this.logItems = this.logItems.filter(
              item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
            );
            this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration, _executing: true });
          } else {
            this.logItems = this.logItems.filter(
              item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
            );
            this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
          }
          if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollChatToBottom()
        },
        compact: () => {
          this.logItems.push({ type: 'system', content: '【会话已压缩】' })
          this.loadMessages()
        },
        done: (data) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing));
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'completed'
          this.$emit('status-change', 'completed')
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.scrollChatToBottom()
          this.$emit('design-updated')
        },
        stopped: () => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing));
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.$emit('status-change', 'idle')
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.scrollChatToBottom()
        },
        error: (data) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing));
          this.$message.error(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.$emit('status-change', 'idle')
        }
      })
    },
    scrollChatToBottom(force = false) {
      const snap = snapshotScroll(this.$refs.messagesContainer)
      this.$nextTick(() => scrollToBottom(this.$refs.messagesContainer, { force, prevSnapshot: snap }))
    },
    renderMarkdown(content) {
      if (!content) return ''
      return marked(content, { breaks: true })
    },
    formatInput(name, args) {
      try {
        const parsed = typeof args === 'string' ? JSON.parse(args) : args
        if (name === 'bash' || name === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ` (${parsed.workdir})` : '')
        }
        if (name === 'read_file') {
          return parsed.file_path + (parsed.offset ? `:${parsed.offset}` : '')
        }
        if (name === 'edit_file' || name === 'write_file') {
          return parsed.file_path
        }
        if (name === 'glob' || name === 'find_files') {
          return parsed.pattern + (parsed.directory ? ` (${parsed.directory})` : '')
        }
        if (name === 'grep' || name === 'search_content') {
          return `"${parsed.pattern}" (${parsed.directory || ''})`
        }
        return JSON.stringify(parsed)
      } catch { return args }
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
        if (textarea) textarea.focus()
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
    openSkillSelect() {
      const textarea = this.$el.querySelector('.input-area textarea')
      this.skillCursorPos = textarea ? textarea.selectionStart : -1
      this.skillSelectVisible = true
    },
    onSkillSelected(skillName) {
      const tag = `[${skillName}] `
      const pos = this.skillCursorPos >= 0 ? this.skillCursorPos : 0
      this.inputMessage = this.inputMessage.slice(0, pos) + tag + this.inputMessage.slice(pos)
      this.cancelSkillSelect()
    },
    cancelSkillSelect() {
      this.skillSelectVisible = false
    },
    openTemplateSelect() {
      const textarea = this.$el.querySelector('.input-area textarea')
      this.skillCursorPos = textarea ? textarea.selectionStart : -1
      this.templateSelectVisible = true
    },
    onTemplateSelected(templatePath) {
      const tag = `【设计基础模版】${templatePath} `
      const pos = this.skillCursorPos >= 0 ? this.skillCursorPos : 0
      this.inputMessage = this.inputMessage.slice(0, pos) + tag + this.inputMessage.slice(pos)
    },
  }
}
</script>

<style scoped>
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: #404040; border-radius: 3px; }
.chat-messages::-webkit-scrollbar-thumb:hover { background: #505050; }

.chat-messages {
  padding: 0 16px 16px;
  font-size: 14px;
  line-height: 1.6;
}

.user-question {
  color: #60a5fa;
  font-weight: bold;
  border: 1px solid #60a5fa;
  padding: 15px;
  margin: 15px;
  border-radius: 10px;
  display: inline-block;
  max-width: 80%;
  text-align: left;
}

.ai-thought {
  color: #d4d4d8;
  margin-bottom: 16px;
}

.log-mute {
  color: #84848a;
  margin-bottom: 16px;
  white-space: pre;
}

.tool-input {
  color: #60a5fa;
  margin-left: 8px;
}

.build-info {
  color: #84848a;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.chat-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.chat-image-thumb {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #3f3f46;
  cursor: zoom-in;
  transition: border-color 0.2s;
}

.chat-image-thumb:hover { border-color: #60a5fa; }

.chat-input-area {
  padding: 12px 16px;
  background: #121212;
  border-top: 1px solid #1e1e1e;
}

.input-panel {
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.input-wrapper {
  position: relative;
}

.input-area {
  flex: 1;
}

.input-area ::v-deep .el-textarea__inner {
  border: none;
  border-radius: 0;
  background: #ffffff;
  color: #4b5563;
  resize: none;
}

.input-area ::v-deep .el-textarea__inner:focus {
  box-shadow: none;
}

.input-panel .input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  gap: 6px;
  background: #ffffff;
}

.input-actions-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-panel .status-action {
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
}

.input-panel .status-action:hover {
  color: #60a5fa;
}

.input-panel .separator {
  color: #d1d5db;
  font-size: 12px;
}

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

.model-selector { cursor: pointer; }
.model-selector:hover { color: #60a5fa; }

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

.tool-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px; vertical-align: middle;
}
</style>
