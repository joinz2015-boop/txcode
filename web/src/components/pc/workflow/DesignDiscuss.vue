<template>
  <div class="discuss-container">
    <div class="discuss-dropdown" v-if="discussions.length > 0">
      <div class="dropdown-trigger" @click="dropdownOpen = !dropdownOpen">
        <span class="dropdown-title">{{ currentDiscussion ? currentDiscussion.title : '选择探讨' }}</span>
        <i class="el-icon-arrow-down" :class="{ rotated: dropdownOpen }"></i>
      </div>
      <div class="dropdown-menu" v-if="dropdownOpen">
        <div
          v-for="disc in discussions"
          :key="disc.id"
          class="dropdown-item"
          :class="{ active: currentDiscussion && currentDiscussion.id === disc.id }"
        >
          <span class="item-title" @click="switchDiscussion(disc)">{{ disc.title }}</span>
          <span class="item-actions" @click.stop>
            <span class="menu-trigger" @click.stop="activeMenuId = activeMenuId === disc.id ? null : disc.id">⋮</span>
            <div class="menu-popup" v-if="activeMenuId === disc.id">
              <div class="menu-item" @click.stop="startRename(disc)">重命名</div>
              <div class="menu-item danger" @click.stop="confirmDelete(disc)">删除</div>
            </div>
          </span>
        </div>
        <div class="dropdown-item add-item" @click="createDiscussion">
          <i class="el-icon-plus"></i> 新建探讨
        </div>
      </div>
    </div>

    <div v-if="!currentDiscussion && discussions.length === 0" class="empty-discuss">
      <div class="empty-card" @click="createDiscussion">
        <i class="el-icon-chat-dot-round"></i>
        <p>新建探讨</p>
        <span>点击创建第一个方案探讨会话</span>
      </div>
    </div>

    <template v-if="currentDiscussion">
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="!logItems.length" class="empty-state">
          <i class="el-icon-chat-dot-round"></i>
          <p>与AI探讨方案内容，不会修改方案文件</p>
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
          <div v-else-if="item.type === 'think'" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
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
            placeholder="输入探讨内容... (Enter 发送, Ctrl+Enter 换行)"
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
        <span>会话：{{ currentDiscussion.sessionId ? currentDiscussion.sessionId.slice(0, 8) : '--------' }}</span>
        <span class="separator">|</span>
        <span>token：{{ promptTokens || 0 }}</span>
        <span class="separator">|</span>
        <span class="status-action" @click="openSkillSelect" @mousedown.prevent>选择Skill</span>
      </div>
    </template>

    <el-dialog :visible.sync="deleteDialogVisible" title="确认删除" width="360px" :close-on-click-modal="false">
      <p>确定要删除探讨「{{ deleteTarget ? deleteTarget.title : '' }}」吗？此操作不可恢复。</p>
      <span slot="footer">
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="doDelete">删除</el-button>
      </span>
    </el-dialog>

    <ModelSelectDialog
      :visible.sync="modelSelectVisible"
      :current-model="modelName"
      @select="onModelSelected"
    />

    <SkillSelectDialog
      :visible.sync="skillSelectVisible"
      @select="onSkillSelected"
      @close="skillSelectVisible = false"
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
import SkillSelectDialog from '../skill/SkillSelectDialog.vue'
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import ImagePreviewList from '../chat/ImagePreviewList.vue'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'
import { mediaChatMixin } from '../../../lib/mediaChat.js'

export default {
  name: 'DesignDiscuss',
  components: { ModelSelectDialog, SkillSelectDialog, ResizableTextarea, ImagePreviewList },
  mixins: [mediaChatMixin()],
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      discussions: [],
      currentDiscussion: null,
      dropdownOpen: false,
      activeMenuId: null,
      renamingId: null,
      renameTitle: '',
      deleteDialogVisible: false,
      deleteTarget: null,
      logItems: [],
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      modelName: '',
      modelSelectVisible: false,
      skillSelectVisible: false,
      sessionStatus: 'idle',
      wsUnsubscribe: null
    }
  },
  computed: {
    specFilePath() {
      if (!this.category || !this.name) return ''
      return `${this.reqBasePath}/${this.category}/${this.name}/${this.name}_方案.md`
    },
    sessionFilePath() {
      if (!this.category || !this.name) return ''
      return `${this.reqBasePath}/${this.category}/${this.name}/session.json`
    }
  },
  watch: {
    category: { handler() { this.loadData() } },
    name: { handler() { this.loadData() } }
  },
  async mounted() {
    document.addEventListener('mousedown', this.onDocumentMouseDown)
    await this.loadData()
    await this.loadDefaultModel()
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onDocumentMouseDown)
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
    onDocumentMouseDown(e) {
      if (this.activeMenuId && !e.target.closest('.item-actions')) {
        this.activeMenuId = null
      }
      if (this.dropdownOpen && !e.target.closest('.discuss-dropdown')) {
        this.dropdownOpen = false
      }
    },
    async loadData() {
      await this.loadDiscussions()
    },
    async loadDiscussions() {
      if (!this.category || !this.name) {
        this.discussions = []
        this.currentDiscussion = null
        return
      }
      try {
        const fileRes = await api.getFileContent(this.sessionFilePath)
        if (fileRes && fileRes.data?.content) {
          const sessionData = JSON.parse(fileRes.data.content)
          this.discussions = sessionData.designDiscussions || []
        } else {
          this.discussions = []
        }
        if (this.discussions.length > 0 && !this.currentDiscussion) {
          await this.switchDiscussion(this.discussions[0])
        }
      } catch (e) {
        console.error('Load discussions failed:', e)
        this.discussions = []
        this.currentDiscussion = null
      }
    },
    async saveDiscussions() {
      if (!this.category || !this.name) return
      try {
        const fileRes = await api.getFileContent(this.sessionFilePath)
        let sessionData = {}
        if (fileRes && fileRes.data?.content) {
          sessionData = JSON.parse(fileRes.data.content)
        }
        sessionData.designDiscussions = this.discussions
        await api.writeFile(this.sessionFilePath, JSON.stringify(sessionData, null, 2))
      } catch (e) {
        console.error('Save discussions failed:', e)
      }
    },
    async createDiscussion() {
      try {
        const title = `探讨${this.discussions.length + 1}`
        const res = await api.createSession(title)
        const newDisc = {
          id: res.data?.id || res.data?.sessionId || Date.now().toString(),
          sessionId: res.data?.id || res.data?.sessionId,
          title: title,
          createdAt: new Date().toISOString()
        }
        this.discussions.push(newDisc)
        await this.saveDiscussions()
        this.dropdownOpen = false
        await this.switchDiscussion(newDisc)
      } catch (e) {
        console.error('Create discussion failed:', e)
        this.$message.error('创建探讨失败')
      }
    },
    async switchDiscussion(disc) {
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
        this.wsUnsubscribe = null
      }
      this.currentDiscussion = disc
      this.dropdownOpen = false
      this.activeMenuId = null
      this.logItems = []
      this.inputMessage = ''
      this.disabled = false
      this.stopping = false
      this.promptTokens = 0
      this.sessionStatus = 'idle'
      this.mediaFiles = []
      if (disc && disc.sessionId) {
        await this.loadMessages()
        this.subscribeSession()
      }
    },
    startRename(disc) {
      this.activeMenuId = null
      this.$prompt('请输入新名称', '重命名探讨', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: disc.title
      }).then(async ({ value }) => {
        if (value && value.trim()) {
          disc.title = value.trim()
          await this.saveDiscussions()
        }
      }).catch(() => {})
    },
    confirmDelete(disc) {
      this.activeMenuId = null
      this.deleteTarget = disc
      this.deleteDialogVisible = true
    },
    async doDelete() {
      const disc = this.deleteTarget
      this.deleteDialogVisible = false
      this.deleteTarget = null
      if (!disc) return
      try {
        await api.deleteSession(disc.sessionId)
        const idx = this.discussions.findIndex(d => d.id === disc.id)
        if (idx !== -1) {
          this.discussions.splice(idx, 1)
        }
        await this.saveDiscussions()
        if (this.currentDiscussion && this.currentDiscussion.id === disc.id) {
          if (this.discussions.length > 0) {
            await this.switchDiscussion(this.discussions[0])
          } else {
            if (this.wsUnsubscribe) {
              this.wsUnsubscribe()
              this.wsUnsubscribe = null
            }
            this.currentDiscussion = null
            this.logItems = []
            this.promptTokens = 0
            this.sessionStatus = 'idle'
          }
        }
      } catch (e) {
        console.error('Delete discussion failed:', e)
        this.$message.error('删除探讨失败')
      }
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      const hasMedia = this.mediaFiles && this.mediaFiles.length > 0
      if ((!content && !hasMedia) || this.disabled) return

      if (!this.currentDiscussion || !this.currentDiscussion.sessionId) {
        this.$message.error('会话不存在，请刷新页面')
        return
      }

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      const contextMsg = `方案路径：${this.specFilePath}\n\n这个是对这个方案的探讨 你只需要回答用户的问题即可 不需要修改方案 也不要修改代码\n\n用户输入: ${content}`

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      const sentMediaFiles = (this.mediaFiles || [])
        .filter(f => !f.uploading && f.filePath)
        .map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))
      this.logItems.push({ type: 'chat', content: content, mediaFiles: sentMediaFiles })
      this.scrollChatToBottom(true)

      api.sessionWsSend(this.currentDiscussion.sessionId, 'chat', {
        message: contextMsg,
        sessionId: this.currentDiscussion.sessionId,
        modelName: this.modelName || undefined,
        mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
      })
      this.mediaFiles = []
    },
    stopChat() {
      if (!this.currentDiscussion || !this.currentDiscussion.sessionId || this.stopping) return
      this.stopping = true
      api.sessionWsSend(this.currentDiscussion.sessionId, 'stop', {
        sessionId: this.currentDiscussion.sessionId
      })
    },
    subscribeSession() {
      if (!this.currentDiscussion || !this.currentDiscussion.sessionId) return

      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
      }

      this.wsUnsubscribe = api.wsSubscribe(this.currentDiscussion.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.currentDiscussion.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
        },
        todos: (data) => {
          if (data?.todos) this.logItems.push({ type: 'todos', todos: data.todos })
          this.scrollChatToBottom()
        },
        step: (data) => {
          this.logItems.push({
            type: 'step',
            thought: data.thought,
            toolCalls: data.toolCalls,
            success: data.success
          })
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
      this.$nextTick(() => {
        scrollToBottom(this.$refs.messagesContainer, { force, prevSnapshot: snap })
      })
    },
    async loadMessages() {
      if (!this.currentDiscussion || !this.currentDiscussion.sessionId) return
      try {
        const res = await api.getMessages(this.currentDiscussion.sessionId)
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
    openSkillSelect() {
      this.skillSelectVisible = true
    },
    onSkillSelected(skillName) {
      const tag = `[${skillName}] `
      const existingIdx = this.inputMessage.lastIndexOf('[')
      if (existingIdx !== -1 && this.inputMessage.slice(existingIdx).match(/^\[[\w-]+\] /)) {
        this.inputMessage = this.inputMessage.slice(0, existingIdx) + tag
      } else {
        this.inputMessage = tag + this.inputMessage
      }
      this.skillSelectVisible = false
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
    }
  }
}
</script>

<style scoped>
.discuss-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.discuss-dropdown {
  position: relative;
  flex-shrink: 0;
  border-bottom: 1px solid #1e1e1e;
}
.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  color: #f4f4f5;
  font-size: 13px;
}
.dropdown-trigger:hover {
  background: #1a1a1a;
}
.dropdown-title {
  font-weight: 500;
}
.dropdown-trigger .el-icon-arrow-down {
  transition: transform 0.2s;
  font-size: 12px;
  color: #84848a;
}
.dropdown-trigger .el-icon-arrow-down.rotated {
  transform: rotate(180deg);
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #1e1e1e;
  border-top: none;
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
}
.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  color: #d4d4d8;
  font-size: 13px;
}
.dropdown-item:hover {
  background: #252525;
}
.dropdown-item.active {
  background: #1a3a5c;
}
.dropdown-item.add-item {
  border-top: 1px solid #1e1e1e;
  color: #60a5fa;
  justify-content: flex-start;
  gap: 6px;
}
.item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-actions {
  flex-shrink: 0;
  margin-left: 8px;
  position: relative;
}
.menu-trigger {
  cursor: pointer;
  color: #84848a;
  padding: 2px 6px;
  border-radius: 4px;
}
.menu-trigger:hover {
  background: #333;
  color: #f4f4f5;
}
.menu-actions {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}
.menu-popup {
  position: absolute;
  right: 0;
  top: 100%;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  z-index: 200;
  min-width: 100px;
  overflow: hidden;
}
.menu-item {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #d4d4d8;
}
.menu-item:hover {
  background: #252525;
}
.menu-item.danger {
  color: #ef4444;
}
.empty-discuss {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 48px;
  border: 2px dashed #3f3f46;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.empty-card:hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.05);
}
.empty-card i {
  font-size: 36px;
  color: #60a5fa;
}
.empty-card p {
  font-size: 16px;
  color: #f4f4f5;
  margin: 0;
}
.empty-card span {
  font-size: 13px;
  color: #84848a;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  font-size: 14px;
  line-height: 1.6;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #84848a;
}
.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
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
.chat-input-area { padding: 12px 16px; background: #121212; border-top: 1px solid #1e1e1e; flex-shrink: 0; }
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
.model-selector { cursor: pointer; }
.model-selector:hover { color: #60a5fa; }
.status-action { cursor: pointer; }
.status-action:hover { color: #60a5fa; }
.flex { display: flex; }
.justify-end { justify-content: flex-end; }
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
