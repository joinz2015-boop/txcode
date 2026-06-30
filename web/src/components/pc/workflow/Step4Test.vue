<template>
  <div class="step4-container">
    <div class="step4-main">
      <div class="code-chat-panel">
        <div class="panel-header">
          <span><i class="el-icon-s-check"></i> 测试验收对话</span>
          <el-button type="primary" size="small" @click="insertTestCommand" :disabled="disabled">
            <i class="el-icon-s-claim"></i> 根据方案测试
          </el-button>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="!logItems.length" class="empty-state">
            <i class="el-icon-chat-dot-round"></i>
            <p>点击上方按钮或输入测试要求进行验收</p>
          </div>
          <template v-for="(item, idx) in logItems" :key="idx">
            <div v-if="item.type === 'todos'" class="todos-list">
              <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
                <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                <span class="todo-name">{{ todo.name }}</span>
              </div>
            </div>
            <div v-if="item.type === 'chat'" class="flex justify-end">
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
            <div v-else-if="item.type === 'think'" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
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
              placeholder="输入测试要求... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
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
              <el-button
                v-for="action in customActions"
                :key="action.id"
                type="info"
                size="small"
                @click="executeCustomAction(action)"
                :disabled="disabled"
              >
                {{ action.name }}
              </el-button>
              <el-button v-if="disabled && !stopping" type="danger" @click="stopChat" class="stop-btn" size="small">
                ■ 停止
              </el-button>
              <el-button v-else-if="stopping" type="info" disabled class="stop-btn" size="small">
                停止中...
              </el-button>
              <el-button v-else type="primary" :disabled="!inputMessage.trim() && mediaFiles.length === 0" @click="sendMessage" class="send-btn" size="small">
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
          <span class="separator">|</span>
          <span class="status-action" @click="openCommandDialog" @mousedown.prevent>命令</span>
          <span class="separator">|</span>
          <span class="status-action" @click="openFileSelect" @mousedown.prevent>选择文件</span>
          <span class="separator">|</span>
          <span class="status-action" @click="openSkillSelect" @mousedown.prevent>选择Skill</span>
          <span class="separator">|</span>
          <span class="status-action" @click="openDesignSelect" @mousedown.prevent>选择设计</span>
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

    <SkillSelectDialog
      :visible.sync="skillSelectVisible"
      @select="onSkillSelected"
      @close="cancelSkillSelect"
    />

    <DesignSelectDialog
      :visible.sync="designSelectVisible"
      @select="onDesignSelected"
      @close="designSelectVisible = false"
    />

    <div v-if="previewImage" class="image-lightbox" @click="closeImagePreview">
      <span class="lightbox-close" @click="closeImagePreview">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import { api } from '../../../api/index.js'
import { marked } from 'marked'
import ModelSelectDialog from '../model/ModelSelectDialog.vue'
import CommandDialog from '../common/CommandDialog.vue'
import FileSelectDialog from '../file/FileSelectDialog.vue'
import SkillSelectDialog from '../skill/SkillSelectDialog.vue'
import DesignSelectDialog from '../design/DesignSelectDialog.vue'
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import ImagePreviewList from '../chat/ImagePreviewList.vue'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'
import { mediaChatMixin } from '../../../lib/mediaChat.js'

export default {
  name: 'Step4Test',
  components: { ModelSelectDialog, CommandDialog, FileSelectDialog, SkillSelectDialog, DesignSelectDialog, ResizableTextarea, ImagePreviewList },
  mixins: [mediaChatMixin()],
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      dotAnimation: '',
      dotInterval: null,
      dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'],
      logItems: [],
      modelName: '',
      modelSelectVisible: false,
      commandDialogVisible: false,
      fileSelectVisible: false,
      skillSelectVisible: false,
      designSelectVisible: false,
      skillCursorPos: -1,
      sessionId: '',
      sessionStatus: 'idle',
      customActions: []
    }
  },
  computed: {
    specFilePath() {
      if (!this.category || !this.name) return ''
      return `${this.reqBasePath}/${this.category}/${this.name}/${this.name}_方案.md`
    }
  },
  watch: {
    category: { handler() { this.loadSession() } },
    name: { handler() { this.loadSession() } }
  },
  async mounted() {
    await this.loadSession()
    await this.loadDefaultModel()
    await this.loadCustomActions()
    api.ws.init()
  },
  beforeDestroy() {
    if (this.dotInterval) {
      clearInterval(this.dotInterval)
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
    async loadSession() {
      if (!this.category || !this.name) {
        this.sessionId = ''
        this.$emit('update:sessionId', '')
        return
      }
      try {
        const sessionFilePath = `${this.reqBasePath}/${this.category}/${this.name}/session.json`
        const fileRes = await api.getFileContent(sessionFilePath)
        if (fileRes && fileRes.data?.content) {
          const sessionData = JSON.parse(fileRes.data.content)
          this.sessionId = sessionData.testSessionId || ''
        } else {
          this.sessionId = ''
        }
        this.$emit('update:sessionId', this.sessionId)
        if (this.sessionId) {
          await this.loadMessages()
          this.subscribeSession()
        } else {
          this.logItems = []
        }
      } catch (e) {
        console.error('Load session failed:', e)
        this.sessionId = ''
        this.$emit('update:sessionId', '')
        this.logItems = []
      }
    },
    insertTestCommand() {
      if (this.specFilePath) {
        this.inputMessage = `根据 ${this.specFilePath} 方案测试相应功能是否实现。`
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      const hasMedia = this.mediaFiles && this.mediaFiles.length > 0
      if ((!content && !hasMedia) || this.disabled) return

      if (!this.sessionId) {
        this.$message.error('会话不存在，请刷新页面')
        return
      }

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      const sentMediaFiles = (this.mediaFiles || [])
        .filter(f => !f.uploading && f.filePath)
        .map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))
      this.logItems.push({ type: 'chat', content: content, mediaFiles: sentMediaFiles })
      this.scrollChatToBottom(true)

      api.sessionWsSend(this.sessionId, 'chat', {
        message: content,
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
          this.scrollChatToBottom()
        },
        step: (data) => {
          this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
          if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollChatToBottom()
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
      console.log('[Step4Test] scrollChatToBottom called, force:', force, 'snap:', JSON.stringify(snap))
      this.$nextTick(() => {
        scrollToBottom(this.$refs.messagesContainer, { force, prevSnapshot: snap })
      })
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        this.logItems = res.data || []
        this.scrollChatToBottom(true)
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
    openDesignSelect() {
      this.designSelectVisible = true
    },
    onDesignSelected(design) {
      const tag = `[设计:${design.name}](${design.path}) `
      this.inputMessage += tag
      this.designSelectVisible = false
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
    },
    async loadCustomActions() {
      try {
        const res = await api.getCustomActions('test')
        this.customActions = res.data || []
      } catch (e) {
        console.error('Load custom actions failed:', e)
        this.customActions = []
      }
    },
    executeCustomAction(action) {
      this.inputMessage = action.prompt
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.input-area textarea')
        if (textarea) textarea.focus()
        if (action.auto_send) {
          this.sendMessage()
        }
      })
    }
  }
}
</script>

<style scoped>
.step4-container { height: 100%; display: flex; flex-direction: column; }
.step4-main { display: flex; flex: 1; overflow: hidden; padding: 16px; }
.code-chat-panel { flex: 1; background: #121212; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #121212; border-bottom: 1px solid #1e1e1e; flex-shrink: 0; }
.panel-header span { font-size: 14px; font-weight: 500; color: #f4f4f5; }
.chat-messages { flex: 1; overflow-y: auto; padding: 16px; font-size: 14px; line-height: 1.6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #84848a; }
.empty-state i { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.todos-list { margin-bottom: 16px; color: #d4d4d8; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
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
.ai-thought { color: #d4d4d8; margin-bottom: 16px; }
.log-mute { color: #84848a; margin-bottom: 16px; white-space: pre; }
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: #60a5fa; margin-left: 8px; }
.build-info { color: #84848a; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.chat-input-area { padding: 12px 16px; background: #121212; border-top: 1px solid #1e1e1e; }
.input-wrapper { position: relative; flex: 1; }
.input-area { flex: 1; }
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
.chat-images { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
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
.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 30px;
  color: #fff;
  font-size: 40px;
  cursor: pointer;
  z-index: 1;
}
.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: default;
}
.upload-btn { height: auto; }
</style>
