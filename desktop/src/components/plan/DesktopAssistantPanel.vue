<template>
  <div class="assistant-panel" :style="{ width: panelWidth + 'px', minWidth: '260px' }">
    <div class="assistant-tabs">
      <button
        class="assistant-tab"
        :class="{ active: activeTab === 'design' }"
        @click="activeTab = 'design'"
      >AI生成方案</button>
      <button
        class="assistant-tab"
        :class="{ active: activeTab === 'discuss' }"
        @click="activeTab = 'discuss'"
      >AI方案交流</button>
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
          <div v-else-if="item.type === 'step'" :key="'ds-' + idx">
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
          </div>
          <div v-else :key="idx" class="assistant-msg" :class="item.role">
            <div class="amsg-text" v-html="renderMarkdown(item.content || '')"></div>
          </div>
        </template>
        <div v-if="designPanel.disabled" class="assistant-msg ai">
          <div class="amsg-text" style="color:var(--text-muted)">正在思考...</div>
        </div>
      </div>
      <div class="assistant-input-area">
        <DesktopImagePreviewList
          :files="designMediaFiles"
          :disabled="designPanel.disabled"
          @remove="removeDesignMedia"
        />
        <div class="assistant-input-wrap">
          <DesktopResizableTextarea
            v-model="designPanel.input"
            :rows="3"
            :minRows="2"
            :maxRows="15"
            placeholder="输入需求描述... (Enter 发送, Ctrl+Enter 换行，可粘贴图片)"
            :disabled="designPanel.disabled"
            @keydown="handleAssistKeydown($event, 'design')"
            @paste-image="handleDesignPasteImages"
          />
          <div class="assistant-input-actions-row">
            <div class="input-actions-left">
              <span class="status-action" @click="fileSelectVisible = true" @mousedown.prevent>选择文件</span>
              <span class="separator">|</span>
              <span class="status-action" @click="skillSelectVisible = true" @mousedown.prevent>选择Skill</span>
              <span class="separator">|</span>
              <span class="status-action" @click="designSelectVisible = true" @mousedown.prevent>选择设计</span>
              <span class="separator">|</span>
              <span class="status-action" @click="commandDialogVisible = true" @mousedown.prevent>命令</span>
            </div>
            <div class="input-actions-right">
              <button class="action-btn btn-upload" @click="triggerDesignImageUpload" :disabled="designPanel.disabled">图片</button>
              <button v-if="designPanel.disabled && !designStopping" class="action-btn btn-stop" @click="stopDesign">■ 停止</button>
              <button v-else-if="designStopping" class="action-btn btn-stop" disabled>停止中...</button>
              <button v-else class="btn-send" @click="sendDesignMessage" :disabled="!designPanel.input.trim() && !designMediaFiles.length">发送</button>
            </div>
          </div>
        </div>
        <input ref="designImageInput" type="file" accept="image/*" multiple style="display:none" @change="handleDesignImageFiles" />
      </div>
      <div class="assistant-status-bar">
        <span :style="{ color: designPanel.disabled ? '#f59e0b' : '#22c55e' }">
          <span v-if="designPanel.disabled && !designStopping" class="thinking-spinner"></span>
          {{ designPanel.disabled ? (designStopping ? '■ 停止中' : '处理中') : '✓ 就绪' }}
        </span>
        <span class="sep">|</span>
        <span class="status-action" @click="$emit('open-model-select')" @mousedown.prevent>模型: {{ currentModel }} ▾</span>
        <span class="sep">|</span>
        <span>会话: {{ designPanel.sessionId ? designPanel.sessionId.slice(0, 8) : '未创建' }}</span>
        <span class="sep">|</span>
        <span>token: {{ designPanel.promptTokens || 0 }}</span>
      </div>
    </div>

    <div v-show="activeTab === 'discuss'" class="tab-panel">
      <div class="discuss-section">
        <div class="discuss-dropdown" v-if="discussList.length > 0">
          <button class="discuss-dropdown-toggle" @click="discussDropdownOpen = !discussDropdownOpen">
            <span class="discuss-item-title">{{ currentDiscussTitle }}</span>
            <span class="dropdown-arrow" :class="{ open: discussDropdownOpen }">▾</span>
          </button>
          <div v-if="discussDropdownOpen" class="discuss-dropdown-menu">
            <div
              v-for="d in discussList"
              :key="d.id"
              class="discuss-dropdown-item"
              :class="{ active: currentDiscuss && currentDiscuss.id === d.id }"
            >
              <span class="d-item-title" @click="switchDiscuss(d); discussDropdownOpen = false">{{ d.title }}</span>
              <span class="d-item-actions" @click.stop>
                <span class="menu-trigger" @click.stop="menuId = menuId === d.id ? null : d.id">⋮</span>
                <div class="disc-menu-popup" v-if="menuId === d.id">
                  <div class="menu-item" @click.stop="startRename(d)">重命名</div>
                  <div class="menu-item danger" @click.stop="confirmDelete(d)">删除</div>
                </div>
              </span>
            </div>
            <button class="discuss-new-btn" @click="createDiscuss">+ 新建探讨</button>
          </div>
        </div>
        <div v-else class="assistant-empty" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;" @click="createDiscuss">
          <p>与AI探讨方案内容，不会修改方案文件</p>
          <button class="btn-send" style="margin-top:8px;">新建探讨</button>
        </div>

        <template v-if="currentDiscuss">
          <div class="assistant-chat-messages" ref="discussMessages" style="flex:1;">
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
              <div v-else-if="item.type === 'step'" :key="'ds2-' + idx">
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
              </div>
              <div v-else :key="idx" class="assistant-msg" :class="item.role">
                <div class="amsg-text" v-html="renderMarkdown(item.content || '')"></div>
              </div>
            </template>
            <div v-if="discussPanel.disabled" class="assistant-msg ai">
              <div class="amsg-text" style="color:var(--text-muted)">正在思考...</div>
            </div>
          </div>
          <div class="assistant-input-area">
            <DesktopImagePreviewList
              :files="discussMediaFiles"
              :disabled="discussPanel.disabled"
              @remove="removeDiscussMedia"
            />
            <div class="assistant-input-wrap">
              <DesktopResizableTextarea
                v-model="discussPanel.input"
                :rows="3"
                :minRows="2"
                :maxRows="15"
                placeholder="输入探讨内容... (Enter 发送, Ctrl+Enter 换行，可粘贴图片)"
                :disabled="discussPanel.disabled"
                @keydown="handleAssistKeydown($event, 'discuss')"
                @paste-image="handleDiscussPasteImages"
              />
              <div class="assistant-input-actions-row">
                <div class="input-actions-left">
                  <span class="status-action" @click="fileSelectVisible = true" @mousedown.prevent>选择文件</span>
                  <span class="separator">|</span>
                  <span class="status-action" @click="skillSelectVisible = true" @mousedown.prevent>选择Skill</span>
                  <span class="separator">|</span>
                  <span class="status-action" @click="designSelectVisible = true" @mousedown.prevent>选择设计</span>
                  <span class="separator">|</span>
                  <span class="status-action" @click="commandDialogVisible = true" @mousedown.prevent>命令</span>
                </div>
                <div class="input-actions-right">
                  <button class="action-btn btn-upload" @click="triggerDiscussImageUpload" :disabled="discussPanel.disabled">图片</button>
                  <button v-if="discussPanel.disabled && !discussStopping" class="action-btn btn-stop" @click="stopDiscuss">■ 停止</button>
                  <button v-else-if="discussStopping" class="action-btn btn-stop" disabled>停止中...</button>
                  <button v-else class="btn-send" @click="sendDiscussMessage" :disabled="!discussPanel.input.trim() && !discussMediaFiles.length">发送</button>
                </div>
              </div>
            </div>
            <input ref="discussImageInput" type="file" accept="image/*" multiple style="display:none" @change="handleDiscussImageFiles" />
          </div>
          <div class="assistant-status-bar">
            <span :style="{ color: discussPanel.disabled ? '#f59e0b' : '#22c55e' }">
              <span v-if="discussPanel.disabled && !discussStopping" class="thinking-spinner"></span>
              {{ discussPanel.disabled ? (discussStopping ? '■ 停止中' : '处理中') : '✓ 就绪' }}
            </span>
            <span class="sep">|</span>
            <span>会话: {{ discussPanel.sessionId ? discussPanel.sessionId.slice(0, 8) : '未创建' }}</span>
            <span class="sep">|</span>
            <span>token: {{ discussPanel.promptTokens || 0 }}</span>
          </div>
        </template>
      </div>
    </div>

    <DesktopFileSelectDialog v-if="fileSelectVisible" @close="fileSelectVisible = false" @select="onFileSelected" />
    <DesktopSkillSelectDialog v-if="skillSelectVisible" @close="skillSelectVisible = false" @select="onSkillSelected" />
    <DesktopDesignSelectDialog v-if="designSelectVisible" @close="designSelectVisible = false" @select="onDesignSelected" />
    <DesktopCommandDialog v-if="commandDialogVisible" @close="commandDialogVisible = false" @select="onCommandSelected" />

    <DesktopRenameDialog v-if="renameVisible" :value="renameValue" @close="renameVisible = false" @confirm="doRename" />

    <div v-if="deleteVisible" class="overlay" @click.self="deleteVisible = false">
      <div class="dialog">
        <div class="dialog-header">
          <span>确认删除</span>
          <button class="dialog-close" @click="deleteVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <p class="confirm-text">确定要删除探讨「{{ deleteTarget ? deleteTarget.title : '' }}」吗？</p>
          <p class="form-hint">此操作不可恢复</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="deleteVisible = false">取消</button>
          <button class="btn-primary btn-danger" @click="doDelete">删除</button>
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
import { uploadChatImage } from '@/api/index'
import DesktopFileSelectDialog from '@/components/file/DesktopFileSelectDialog.vue'
import DesktopSkillSelectDialog from '@/components/skill/DesktopSkillSelectDialog.vue'
import DesktopDesignSelectDialog from '@/components/design/DesktopDesignSelectDialog.vue'
import DesktopCommandDialog from '@/components/common/DesktopCommandDialog.vue'
import DesktopImagePreviewList from '@/components/chat/DesktopImagePreviewList.vue'
import DesktopResizableTextarea from '@/components/chat/DesktopResizableTextarea.vue'
import DesktopRenameDialog from '@/components/plan/DesktopRenameDialog.vue'

let logSeq = 10000
let mediaIdCounter = 10000

export default {
  name: 'DesktopAssistantPanel',
  components: {
    DesktopFileSelectDialog,
    DesktopSkillSelectDialog,
    DesktopDesignSelectDialog,
    DesktopCommandDialog,
    DesktopImagePreviewList,
    DesktopResizableTextarea,
    DesktopRenameDialog
  },
  props: {
    panelWidth: { type: Number, default: 370 },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null },
    planFilePath: { type: String, default: '' },
    runningSessionIds: { type: Array, default: () => [] }
  },
  data() {
    return {
      activeTab: 'design',
      designStopping: false,
      discussStopping: false,
      designPanel: { sessionId: null, input: '', disabled: false, wsUnsubscribe: null, promptTokens: 0 },
      discussPanel: { sessionId: null, input: '', disabled: false, wsUnsubscribe: null, promptTokens: 0 },
      designLogItems: [],
      discussLogItems: [],
      discussList: [],
      currentDiscuss: null,
      discussDropdownOpen: false,
      designMediaFiles: [],
      discussMediaFiles: [],
      fileSelectVisible: false,
      skillSelectVisible: false,
      designSelectVisible: false,
      commandDialogVisible: false,
      menuId: null,
      renameVisible: false,
      renameValue: '',
      renameTarget: null,
      deleteVisible: false,
      deleteTarget: null,
      _designManuallyEnded: false,
      _discussManuallyEnded: false
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
    },
    runningSessionIds(ids) {
      if (!this._designManuallyEnded) {
        if (this.designPanel.sessionId && ids.includes(this.designPanel.sessionId)) {
          this.designPanel.disabled = true
        } else {
          this.designPanel.disabled = false
        }
      }
      if (!this._discussManuallyEnded) {
        if (this.discussPanel.sessionId && ids.includes(this.discussPanel.sessionId)) {
          this.discussPanel.disabled = true
        } else {
          this.discussPanel.disabled = false
        }
      }
    }
  },
  mounted() {
    document.addEventListener('mousedown', this.onMouseDown)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onMouseDown)
    this.unsubscribeDesign()
    this.unsubscribeDiscuss()
  },
  methods: {
    onMouseDown(e) {
      if (this.menuId && !e.target.closest('.d-item-actions')) this.menuId = null
      if (this.discussDropdownOpen && !e.target.closest('.discuss-dropdown')) this.discussDropdownOpen = false
    },

    initFromMeta(meta) {
      this.designLogItems = []
      this.discussLogItems = []
      this.unsubscribeDesign()
      this.unsubscribeDiscuss()

      if (meta.designSessionId) {
        this.designPanel.sessionId = meta.designSessionId
        this.designPanel.promptTokens = 0
        this.loadDesignMessages(meta.designSessionId)
        this.subscribePanel('design', meta.designSessionId)
      } else {
        this.designPanel.sessionId = null
        this.designPanel.disabled = false
        this.designPanel.promptTokens = 0
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

    async uploadDesignMediaAndGetUrls() {
      const sessionId = this.designPanel.sessionId
      if (!sessionId || this.designMediaFiles.length === 0) return []
      const results = []
      for (const mf of this.designMediaFiles) {
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

    async uploadDiscussMediaAndGetUrls() {
      const sessionId = this.discussPanel.sessionId
      if (!sessionId || this.discussMediaFiles.length === 0) return []
      const results = []
      for (const mf of this.discussMediaFiles) {
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

    processDesignMediaFile(file) {
      if (!file.type.startsWith('image/')) return
      const id = 'media_' + (++mediaIdCounter)
      const reader = new FileReader()
      reader.onload = () => {
        this.designMediaFiles.push({ id, file, dataUrl: reader.result, uploading: false })
      }
      reader.readAsDataURL(file)
    },

    processDiscussMediaFile(file) {
      if (!file.type.startsWith('image/')) return
      const id = 'media_' + (++mediaIdCounter)
      const reader = new FileReader()
      reader.onload = () => {
        this.discussMediaFiles.push({ id, file, dataUrl: reader.result, uploading: false })
      }
      reader.readAsDataURL(file)
    },

    removeDesignMedia(id) {
      this.designMediaFiles = this.designMediaFiles.filter(m => m.id !== id)
    },

    removeDiscussMedia(id) {
      this.discussMediaFiles = this.discussMediaFiles.filter(m => m.id !== id)
    },

    triggerDesignImageUpload() {
      this.$refs.designImageInput && this.$refs.designImageInput.click()
    },

    triggerDiscussImageUpload() {
      this.$refs.discussImageInput && this.$refs.discussImageInput.click()
    },

    handleDesignImageFiles(e) {
      const files = e.target.files
      if (!files) return
      for (const file of files) {
        this.processDesignMediaFile(file)
      }
      e.target.value = ''
    },

    handleDiscussImageFiles(e) {
      const files = e.target.files
      if (!files) return
      for (const file of files) {
        this.processDiscussMediaFile(file)
      }
      e.target.value = ''
    },

    handleDesignPasteImages(files) {
      if (!files) return
      for (const file of files) {
        this.processDesignMediaFile(file)
      }
    },

    handleDiscussPasteImages(files) {
      if (!files) return
      for (const file of files) {
        this.processDiscussMediaFile(file)
      }
    },

    async sendDesignMessage() {
      const val = this.designPanel.input.trim()
      const hasMedia = this.designMediaFiles.length > 0
      if ((!val && !hasMedia) || this.designPanel.disabled) return
      try {
        const sid = await this.ensureDesignSession()
        this.subscribePanel('design', sid)
        const sentMediaFiles = this.designMediaFiles.filter(f => !f.uploading).map(f => ({
          dataUrl: f.dataUrl,
          filePath: f.filePath || '',
          type: f.file ? (f.file.type || 'image/png') : 'image/png'
        }))
        this.pushLogItem('designLogItems', { type: 'chat', content: val, role: 'user', mediaFiles: sentMediaFiles })
        this.designPanel.input = ''

        const imageUrls = await this.uploadDesignMediaAndGetUrls()
        let fullMessage = val
        if (imageUrls.length > 0) fullMessage += '\n图片: ' + imageUrls.join(', ')

        let contextPrefix = ''
        const parentPath = this.currentSession?.meta?.parentPlanPath
        if (parentPath) {
          contextPrefix = `父方案路径：${parentPath}\n`
        }

        this.designPanel.disabled = true
        this._designManuallyEnded = false
        this.designStopping = false
        this.designMediaFiles = []

        ws.send('chat', {
          message: `${contextPrefix}${fullMessage}`,
          sessionId: sid,
          modelName: this.currentModel,
          agent: 'plan',
          planFilePath: this.planFilePath,
          mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
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
      const hasMedia = this.discussMediaFiles.length > 0
      if ((!val && !hasMedia) || this.discussPanel.disabled || !this.discussPanel.sessionId) return
      this.subscribePanel('discuss', this.discussPanel.sessionId)
      const sentMediaFiles = this.discussMediaFiles.filter(f => !f.uploading).map(f => ({
        dataUrl: f.dataUrl,
        filePath: f.filePath || '',
        type: f.file ? (f.file.type || 'image/png') : 'image/png'
      }))
      this.pushLogItem('discussLogItems', { type: 'chat', content: val, role: 'user', mediaFiles: sentMediaFiles })
      this.discussPanel.input = ''

      const imageUrls = await this.uploadDiscussMediaAndGetUrls()
      let fullMessage = val
      if (imageUrls.length > 0) fullMessage += '\n图片: ' + imageUrls.join(', ')

      this.discussPanel.disabled = true
      this._discussManuallyEnded = false
      this.discussStopping = false
      this.discussMediaFiles = []

      ws.send('chat', {
        message: `方案路径：${this.planFilePath}\n\n这个是对这个方案的探讨 你只需要回答用户的问题即可 不需要修改方案 也不要修改代码\n\n用户输入: ${fullMessage}`,
        sessionId: this.discussPanel.sessionId,
        modelName: this.currentModel,
        agent: 'discuss',
        mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
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
          this['_' + key + 'ManuallyEnded'] = true
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
          this['_' + key + 'ManuallyEnded'] = true
          this[stoppingKey] = false
          this.pushLogItem(logKey, { type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollMessages(key))
        },
        error: (d) => {
          this[logKey] = this[logKey].filter(item => !(item.type === 'step' && item._executing))
          this[panelKey].disabled = false
          this['_' + key + 'ManuallyEnded'] = true
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
        this.discussDropdownOpen = false
      } catch (e) {
        console.error('创建探讨失败:', e)
        alert('创建探讨失败: ' + e.message)
      }
    },

    switchDiscuss(d) {
      if (!d) return
      this.unsubscribeDiscuss()
      this.currentDiscuss = d
      this.discussPanel = { sessionId: d.sessionId, input: '', disabled: false, wsUnsubscribe: null, promptTokens: 0 }
      this.loadDiscussMessages(d.sessionId)
      this.subscribePanel('discuss', d.sessionId)
      this.discussDropdownOpen = false
      this.discussMediaFiles = []
    },

    startRename(disc) {
      this.menuId = null
      this.renameTarget = disc
      this.renameValue = disc.title
      this.renameVisible = true
    },

    doRename(newName) {
      if (!newName || !this.renameTarget) return
      this.renameTarget.title = newName
      const meta = { ...this.getMeta() }
      meta.discussSessions = [...this.discussList]
      meta.updatedAt = new Date().toISOString()
      this.saveMetaToServer(meta)
      if (this.currentDiscuss && this.currentDiscuss.id === this.renameTarget.id) {
        this.currentDiscuss.title = newName
      }
      this.renameVisible = false
      this.renameTarget = null
    },

    confirmDelete(disc) {
      this.menuId = null
      this.deleteTarget = disc
      this.deleteVisible = true
    },

    async doDelete() {
      if (!this.deleteTarget) return
      const item = this.deleteTarget
      const wasActive = this.currentDiscuss && this.currentDiscuss.id === item.id
      try {
        if (item.sessionId) await deleteSession(item.sessionId)
      } catch (e) {}
      const meta = { ...this.getMeta() }
      meta.discussSessions = meta.discussSessions.filter(d => d.id !== item.id)
      meta.updatedAt = new Date().toISOString()
      await this.saveMetaToServer(meta)
      this.discussList = meta.discussSessions
      this.deleteVisible = false
      this.deleteTarget = null

      if (wasActive) {
        this.unsubscribeDiscuss()
        if (this.discussList.length > 0) {
          this.switchDiscuss(this.discussList[0])
        } else {
          this.currentDiscuss = null
          this.discussLogItems = []
          this.discussPanel = { sessionId: null, input: '', disabled: false, wsUnsubscribe: null, promptTokens: 0 }
        }
      }
    },

    handleAssistKeydown(e, type) {
      if (e.key !== 'Enter') return
      const panel = type === 'design' ? this.designPanel : this.discussPanel
      if (e.ctrlKey) {
        const textarea = e.target
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        panel.input = panel.input.substring(0, start) + '\n' + panel.input.substring(end)
        this.$nextTick(() => { textarea.selectionStart = textarea.selectionEnd = start + 1 })
      } else if (!e.shiftKey) {
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
    },

    onFileSelected(path) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      panel.input = panel.input + path + ' '
      this.fileSelectVisible = false
    },

    onSkillSelected(name) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      panel.input = '[Skill:' + name + '] ' + panel.input
      this.skillSelectVisible = false
    },

    onDesignSelected(design) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      const tag = `[设计:${design.name || design}](${design.path || design}) `
      panel.input += tag
      this.designSelectVisible = false
    },

    onCommandSelected(cmd) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      panel.input = cmd + ' ' + panel.input
      this.commandDialogVisible = false
    }
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
  padding: 12px 16px 16px;
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
  flex-direction: column;
  background: var(--bg-input);
  border-radius: 8px;
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
  min-height: 50px;
  padding: 6px 8px;
}
.assistant-input-wrap textarea:disabled { opacity: 0.6; }
.assistant-input-wrap textarea::placeholder { color: var(--text-muted); }
.assistant-input-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-top: 1px solid var(--border);
  gap: 6px;
}
.input-actions-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.input-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.status-action {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
}
.status-action:hover { color: var(--accent); }
.separator { color: var(--border); font-size: 12px; user-select: none; }
.btn-send {
  padding: 4px 14px;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  background: var(--accent);
  color: #fff;
}
.btn-send:hover { background: #6366f1; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
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

.discuss-section { display: flex; flex-direction: column; height: 100%; }
.discuss-dropdown { position: relative; border-bottom: 1px solid var(--border); }
.discuss-dropdown-toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--text-primary); font-family: inherit;
}
.discuss-dropdown-toggle:hover { background: var(--bg-hover); }
.discuss-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.dropdown-arrow { font-size: 10px; margin-left: 6px; color: var(--text-muted); transition: transform 0.2s; }
.dropdown-arrow.open { transform: rotate(180deg); }
.discuss-dropdown-menu {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: #fff; border: 1px solid var(--border); border-top: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); max-height: 240px; overflow-y: auto;
}
.discuss-dropdown-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px; cursor: pointer; font-size: 12px;
  color: var(--text-secondary); transition: background 0.1s;
}
.discuss-dropdown-item:hover { background: var(--bg-hover); }
.discuss-dropdown-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.d-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-item-actions { display: flex; align-items: center; position: relative; }
.menu-trigger { cursor: pointer; padding: 2px 6px; border-radius: 4px; font-size: 14px; color: var(--text-muted); }
.menu-trigger:hover { background: var(--bg-hover); color: var(--text-primary); }
.disc-menu-popup {
  position: absolute; right: 0; top: 100%; z-index: 101; min-width: 80px;
  background: #fff; border: 1px solid var(--border); border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12); padding: 4px;
}
.disc-menu-popup .menu-item { padding: 6px 12px; font-size: 12px; cursor: pointer; border-radius: 4px; color: var(--text-primary); }
.disc-menu-popup .menu-item:hover { background: var(--bg-hover); }
.disc-menu-popup .menu-item.danger { color: #ef4444; }
.discuss-new-btn {
  width: 100%;
  padding: 6px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11.5px;
  transition: all 0.15s;
  font-family: inherit;
  border-radius: 0;
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
.thinking-spinner {
  width: 10px; height: 10px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
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

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 400px; max-width: 90vw;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { padding: 20px 16px; }
.confirm-text { text-align: center; font-size: 14px; color: var(--text-primary); padding: 8px 0; }
.form-hint { font-size: 12px; color: var(--text-muted); margin: 0; text-align: center; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: #ef4444; }
.btn-danger:hover { background: #dc2626; }
</style>
