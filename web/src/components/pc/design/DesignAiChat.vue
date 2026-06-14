<template>
  <div class="flex flex-col h-full">
    <div class="chat-messages flex-1 overflow-y-auto px-3 py-2" ref="messagesContainer">
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
            <span :class="item.success !== false ? 'text-green-400' : 'text-red-400'">
              {{ item.success !== false ? '✓' : '✗' }}
            </span>
            {{ tc.function.name }}
            <span v-if="tc.function.arguments" class="tool-input text-[11px]">{{ formatInput(tc.function.name, tc.function.arguments) }}</span>
          </div>
        </template>
        <div v-else-if="item.type === 'think'" :key="idx" class="ai-thought mb-2" v-html="renderMarkdown(item.content)"></div>
      </template>
      <div class="build-info" v-if="modelName">
        <span class="icon">▣</span> Build · {{ modelName }}
      </div>
    </div>

    <div class="chat-input-area">
      <ImagePreviewList
        v-if="mediaFiles && mediaFiles.length > 0"
        :files="mediaFiles"
        :disabled="disabled"
        @remove="removeMedia"
      />
      <div class="input-wrapper">
        <ResizableTextarea
          v-model="inputMessage"
          :rows="5"
          placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行)"
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
        <div class="input-actions">
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
      <div class="status-bar">
        <span :class="sessionStatus === 'processing' ? 'status-thinking' : 'status-ready'">
          <span v-if="sessionStatus === 'processing'" class="thinking-spinner"></span>
          {{ sessionStatus === 'processing' ? '思考中' : '✓ 就绪' }}
        </span>
        <span class="separator">|</span>
        <span>模型：{{ modelName || '-' }}</span>
        <span class="separator">|</span>
        <span>会话：{{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
      </div>
    </div>

    <div v-if="previewImage" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" @click="closeImagePreview">
      <span class="absolute top-4 right-4 text-white text-2xl cursor-pointer">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="max-w-[90vw] max-h-[90vh]" @click.stop />
    </div>
  </div>
</template>

<script>
import { api } from '../../../api/index.js'
import { marked } from 'marked'
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import ImagePreviewList from '../chat/ImagePreviewList.vue'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'
import { mediaChatMixin } from '../../../lib/mediaChat.js'

export default {
  name: 'DesignAiChat',
  components: { ImagePreviewList, ResizableTextarea },
  mixins: [mediaChatMixin()],
  props: {
    basePath: { type: String, default: '.txcode/design' }
  },
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      logItems: [],
      modelName: '',
      sessionId: '',
      sessionStatus: 'idle',
      wsUnsubscribe: null
    }
  },
  async mounted() {
    await this.initSession()
    await this.loadDefaultModel()
    api.ws.init()
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) this.wsUnsubscribe()
  },
  methods: {
    async initSession() {
      const stored = localStorage.getItem('design_ai_session_id')
      if (stored) {
        this.sessionId = stored
        try {
          const res = await api.getSession(this.sessionId)
          if (res && res.data) {
            this.subscribeSession()
            await this.loadMessages()
            return
          }
        } catch (e) {
          console.log('Stored session not found, creating new one')
        }
      }
      try {
        const res = await api.createSession('AI设计助手会话')
        this.sessionId = res.data.id
        localStorage.setItem('design_ai_session_id', this.sessionId)
        this.subscribeSession()
      } catch (e) {
        console.error('Create session failed:', e)
      }
    },
    async loadDefaultModel() {
      try {
        const res = await api.getConfig('model')
        this.modelName = res.data?.value || ''
      } catch (e) { console.error('Load model failed:', e) }
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        this.logItems = res.data || []
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
        await this.initSession()
        if (!this.sessionId) { this.$message.error('无法创建会话'); return }
      }

      if (!this.wsUnsubscribe) this.subscribeSession()

      const contextMsg = `${content}`

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
        },
        step: (data) => {
          this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
          if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollChatToBottom()
        },
        compact: () => {
          this.logItems.push({ type: 'system', content: '【会话已压缩】' })
          this.loadMessages()
        },
        done: (data) => {
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'completed'
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.scrollChatToBottom()
        },
        stopped: () => {
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.scrollChatToBottom()
        },
        error: (data) => {
          this.$message.error(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
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
        const display = {}
        for (const [k, v] of Object.entries(parsed)) {
          if (k === 'content') { display[k] = '(内容过长，已省略)'; continue }
          display[k] = typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '...' : v
        }
        return JSON.stringify(display)
      } catch { return args }
    }
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
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  max-width: 85%;
  color: #e0e0e0;
}

.ai-thought {
  color: #a0a0a0;
  font-size: 13px;
  line-height: 1.6;
  padding: 8px 0;
  border-left: 2px solid #333;
  padding-left: 12px;
}

.system-message {
  color: #888;
  font-size: 12px;
  padding: 4px 0;
}

.build-info {
  color: #555;
  font-size: 11px;
  padding: 8px 0;
  text-align: center;
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

.input-wrapper {
  position: relative;
  flex: 1;
}

.input-area {
  flex: 1;
}

.input-wrapper .input-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 6px;
  z-index: 5;
}

.input-wrapper ::v-deep .el-textarea__inner {
  padding-bottom: 50px;
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
</style>
