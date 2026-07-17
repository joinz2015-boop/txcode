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
        <DesktopImagePreviewList
          :files="designMediaFiles"
          :disabled="designPanel.disabled"
          @remove="removeDesignMedia"
        />
        <div class="assistant-input-wrap">
          <textarea
            v-model="designPanel.input"
            placeholder="输入需求描述... (Enter 发送, Shift+Enter 换行，可粘贴图片)"
            rows="3"
            :disabled="designPanel.disabled"
            @keydown="handleAssistKeydown($event, 'design')"
            @paste="handleDesignPaste"
          ></textarea>
          <div class="assistant-input-actions-row">
            <div class="input-actions-left">
              <button class="fn-btn" @mousedown.prevent @click="showDesignFileDialog = true" title="选择文件">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                <span>文件</span>
              </button>
              <button class="fn-btn" @mousedown.prevent @click="showDesignSkillDialog = true" title="选择 Skill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Skill</span>
              </button>
              <button class="fn-btn" @mousedown.prevent @click="showDesignDesignDialog = true" title="选择设计">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span>设计</span>
              </button>
              <button class="fn-btn" @mousedown.prevent @click="showDesignCommandDialog = true" title="命令">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span>命令</span>
              </button>
              <button class="fn-btn" @mousedown.prevent @click="triggerDesignImageUpload" title="上传图片">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>图片</span>
              </button>
              <input ref="designImageInput" type="file" accept="image/*" multiple style="display:none" @change="handleDesignImageFiles" />
            </div>
            <div class="input-actions-right">
              <button v-if="designPanel.disabled && !designStopping" class="stop-btn" @click="stopDesign">■ 停止</button>
              <button v-if="designPanel.disabled && designStopping" class="stop-btn" disabled>停止中...</button>
              <button class="assistant-send-btn" @click="sendDesignMessage" :disabled="designPanel.disabled">↑</button>
            </div>
          </div>
        </div>
      </div>
      <div class="assistant-status-bar">
        <span :style="{ color: designPanel.disabled ? '#f59e0b' : '#22c55e' }">
          {{ designPanel.disabled ? (designStopping ? '■ 停止中' : '● 处理中') : '✓ 就绪' }}
        </span>
        <span class="sep">|</span>
        <span>模型: {{ currentModel }}</span>
        <template v-if="designSelectedFiles.length > 0">
          <span class="sep">|</span>
          <span class="badge-action" @click="designSelectedFiles = []" title="清除">{{ designSelectedFiles.length }} 文件</span>
        </template>
        <template v-if="designSelectedSkills.length > 0">
          <span class="sep">|</span>
          <span class="badge-action" @click="designSelectedSkills = []" title="清除">{{ designSelectedSkills.length }} Skill</span>
        </template>
        <template v-if="designPanel.disabled && !designStopping">
          <button class="stop-btn" @click="stopDesign">停止</button>
        </template>
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
              v-for="(d, idx) in discussList"
              :key="d.id"
              class="discuss-dropdown-item"
              :class="{ active: currentDiscuss && currentDiscuss.id === d.id }"
              @click="switchDiscuss(d); discussDropdownOpen = false"
            >
              <span class="d-item-title">{{ d.title }}</span>
              <div class="d-item-actions">
                <button class="d-action-btn" @click.stop="renameDiscuss(idx)" title="重命名">✎</button>
                <button class="d-action-btn danger" @click.stop="deleteDiscuss(idx)" title="删除">×</button>
              </div>
            </div>
            <button class="discuss-new-btn" @click="createDiscuss">+ 新建探讨</button>
          </div>
        </div>
        <button v-else class="discuss-new-btn" @click="createDiscuss">+ 新建探讨</button>
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
          <DesktopImagePreviewList
            :files="discussMediaFiles"
            :disabled="discussPanel.disabled"
            @remove="removeDiscussMedia"
          />
          <div class="assistant-input-wrap">
            <textarea
              v-model="discussPanel.input"
              placeholder="输入探讨内容... (Enter 发送, Shift+Enter 换行，可粘贴图片)"
              rows="3"
              :disabled="discussPanel.disabled"
              @keydown="handleAssistKeydown($event, 'discuss')"
              @paste="handleDiscussPaste"
            ></textarea>
            <div class="assistant-input-actions-row">
              <div class="input-actions-left">
                <button class="fn-btn" @mousedown.prevent @click="showDiscussFileDialog = true" title="选择文件">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                  <span>文件</span>
                </button>
                <button class="fn-btn" @mousedown.prevent @click="showDiscussSkillDialog = true" title="选择 Skill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>Skill</span>
                </button>
                <button class="fn-btn" @mousedown.prevent @click="showDiscussDesignDialog = true" title="选择设计">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  <span>设计</span>
                </button>
                <button class="fn-btn" @mousedown.prevent @click="showDiscussCommandDialog = true" title="命令">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                  <span>命令</span>
                </button>
                <button class="fn-btn" @mousedown.prevent @click="triggerDiscussImageUpload" title="上传图片">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>图片</span>
                </button>
                <input ref="discussImageInput" type="file" accept="image/*" multiple style="display:none" @change="handleDiscussImageFiles" />
              </div>
              <div class="input-actions-right">
                <button v-if="discussPanel.disabled && !discussStopping" class="stop-btn" @click="stopDiscuss">■ 停止</button>
                <button v-if="discussPanel.disabled && discussStopping" class="stop-btn" disabled>停止中...</button>
                <button class="assistant-send-btn" @click="sendDiscussMessage" :disabled="discussPanel.disabled">↑</button>
              </div>
            </div>
          </div>
        </div>
        <div class="assistant-status-bar">
          <span :style="{ color: discussPanel.disabled ? '#f59e0b' : '#22c55e' }">
            {{ discussPanel.disabled ? (discussStopping ? '■ 停止中' : '● 处理中') : '✓ 就绪' }}
          </span>
          <span class="sep">|</span>
          <span>会话: {{ currentDiscussTitle }}</span>
          <template v-if="discussSelectedFiles.length > 0">
            <span class="sep">|</span>
            <span class="badge-action" @click="discussSelectedFiles = []" title="清除">{{ discussSelectedFiles.length }} 文件</span>
          </template>
          <template v-if="discussPanel.disabled && !discussStopping">
            <button class="stop-btn" @click="stopDiscuss">停止</button>
          </template>
        </div>
      </div>
    </div>

    <DesktopFileSelectDialog v-if="showDesignFileDialog" @close="showDesignFileDialog = false" @select="onDesignFileSelected" />
    <DesktopFileSelectDialog v-if="showDiscussFileDialog" @close="showDiscussFileDialog = false" @select="onDiscussFileSelected" />
    <DesktopSkillSelectDialog v-if="showDesignSkillDialog" @close="showDesignSkillDialog = false" @select="onDesignSkillSelected" />
    <DesktopSkillSelectDialog v-if="showDiscussSkillDialog" @close="showDiscussSkillDialog = false" @select="onDiscussSkillSelected" />
    <DesktopDesignSelectDialog v-if="showDesignDesignDialog" @close="showDesignDesignDialog = false" @select="onDesignDesignSelected" />
    <DesktopDesignSelectDialog v-if="showDiscussDesignDialog" @close="showDiscussDesignDialog = false" @select="onDiscussDesignSelected" />
    <DesktopCommandDialog v-if="showDesignCommandDialog" @close="showDesignCommandDialog = false" @select="onDesignCommandSelected" />
    <DesktopCommandDialog v-if="showDiscussCommandDialog" @close="showDiscussCommandDialog = false" @select="onDiscussCommandSelected" />
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

let logSeq = 10000
let mediaIdCounter = 10000

export default {
  name: 'DesktopAssistantPanel',
  components: {
    DesktopFileSelectDialog,
    DesktopSkillSelectDialog,
    DesktopDesignSelectDialog,
    DesktopCommandDialog,
    DesktopImagePreviewList
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
      designPanel: { sessionId: null, input: '', disabled: false, wsUnsubscribe: null },
      discussPanel: { sessionId: null, input: '', disabled: false, wsUnsubscribe: null },
      designLogItems: [],
      discussLogItems: [],
      discussList: [],
      currentDiscuss: null,
      discussDropdownOpen: false,
      designSelectedFiles: [],
      designSelectedSkills: [],
      designSelectedDesigns: [],
      discussSelectedFiles: [],
      discussSelectedSkills: [],
      discussSelectedDesigns: [],
      designMediaFiles: [],
      discussMediaFiles: [],
      showDesignFileDialog: false,
      showDesignSkillDialog: false,
      showDesignDesignDialog: false,
      showDesignCommandDialog: false,
      showDiscussFileDialog: false,
      showDiscussSkillDialog: false,
      showDiscussDesignDialog: false,
      showDiscussCommandDialog: false
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
      if (this.designPanel.sessionId && ids.includes(this.designPanel.sessionId)) {
        this.designPanel.disabled = true
      } else {
        this.designPanel.disabled = false
      }
      if (this.discussPanel.sessionId && ids.includes(this.discussPanel.sessionId)) {
        this.discussPanel.disabled = true
      } else {
        this.discussPanel.disabled = false
      }
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

    buildDesignMessagePrefix() {
      let prefix = ''
      if (this.designSelectedFiles.length > 0) {
        prefix += '参考文件:\n' + this.designSelectedFiles.map(f => '- ' + f).join('\n') + '\n'
      }
      if (this.designSelectedSkills.length > 0) {
        prefix += '使用的Skill:\n' + this.designSelectedSkills.map(s => '- ' + s).join('\n') + '\n'
      }
      if (this.designSelectedDesigns.length > 0) {
        prefix += '参考设计:\n' + this.designSelectedDesigns.map(d => '- ' + d).join('\n') + '\n'
      }
      if (this.planFilePath) {
        prefix += '当前方案文件: ' + this.planFilePath + '\n'
      }
      return prefix
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

    handleDesignPaste(e) {
      const items = e.clipboardData && e.clipboardData.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) this.processDesignMediaFile(file)
        }
      }
    },

    handleDiscussPaste(e) {
      const items = e.clipboardData && e.clipboardData.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) this.processDiscussMediaFile(file)
        }
      }
    },

    async sendDesignMessage() {
      const val = this.designPanel.input.trim()
      if (!val || this.designPanel.disabled) return
      try {
        const sid = await this.ensureDesignSession()
        this.subscribePanel('design', sid)
        this.pushLogItem('designLogItems', { type: 'chat', content: val, role: 'user' })
        this.designPanel.input = ''

        const imageUrls = await this.uploadDesignMediaAndGetUrls()
        const prefix = this.buildDesignMessagePrefix()
        let fullMessage = val
        if (prefix) fullMessage = prefix + '\n用户输入: ' + val
        if (imageUrls.length > 0) fullMessage += '\n图片: ' + imageUrls.join(', ')

        let contextPrefix = ''
        const parentPath = this.currentSession?.meta?.parentPlanPath
        if (parentPath) {
          contextPrefix = `父方案路径：${parentPath}\n`
        }

        this.designPanel.disabled = true
        this.designStopping = false
        this.designMediaFiles = []

        ws.send('chat', {
          message: `${contextPrefix}${fullMessage}`,
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

      const imageUrls = await this.uploadDiscussMediaAndGetUrls()
      let prefix = ''
      if (this.discussSelectedFiles.length > 0) {
        prefix += '参考文件:\n' + this.discussSelectedFiles.map(f => '- ' + f).join('\n') + '\n'
      }
      let fullMessage = val
      if (prefix) fullMessage = prefix + '\n用户输入: ' + val
      if (imageUrls.length > 0) fullMessage += '\n图片: ' + imageUrls.join(', ')

      this.discussPanel.disabled = true
      this.discussStopping = false
      this.discussMediaFiles = []

      ws.send('chat', {
        message: `方案路径：${this.planFilePath}\n\n这个是对这个方案的探讨 你只需要回答用户的问题即可 不需要修改方案 也不要修改代码\n\n用户输入: ${fullMessage}`,
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
      this.discussPanel = { sessionId: d.sessionId, input: '', disabled: false, wsUnsubscribe: null }
      this.loadDiscussMessages(d.sessionId)
      this.subscribePanel('discuss', d.sessionId)
      this.discussDropdownOpen = false
      this.discussSelectedFiles = []
      this.discussMediaFiles = []
    },

    renameDiscuss(idx) {
      const item = this.discussList[idx]
      const newName = prompt('输入新名称:', item.title)
      if (newName && newName.trim()) {
        item.title = newName.trim()
        const meta = { ...this.getMeta() }
        meta.discussSessions = [...this.discussList]
        meta.updatedAt = new Date().toISOString()
        this.saveMetaToServer(meta)
        if (this.currentDiscuss && this.currentDiscuss.id === item.id) {
          this.currentDiscuss.title = item.title
        }
      }
    },

    async deleteDiscuss(idx) {
      const item = this.discussList[idx]
      const wasActive = this.currentDiscuss && this.currentDiscuss.id === item.id
      if (!confirm(`确定删除探讨"${item.title}"吗？`)) return
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

    // Dialog handlers
    onDesignFileSelected(path) {
      if (!this.designSelectedFiles.includes(path)) this.designSelectedFiles.push(path)
      this.showDesignFileDialog = false
    },
    onDiscussFileSelected(path) {
      if (!this.discussSelectedFiles.includes(path)) this.discussSelectedFiles.push(path)
      this.showDiscussFileDialog = false
    },
    onDesignSkillSelected(name) {
      if (!this.designSelectedSkills.includes(name)) this.designSelectedSkills.push(name)
      this.showDesignSkillDialog = false
    },
    onDiscussSkillSelected(name) {
      if (!this.discussSelectedSkills.includes(name)) this.discussSelectedSkills.push(name)
      this.showDiscussSkillDialog = false
    },
    onDesignDesignSelected(path) {
      if (!this.designSelectedDesigns.includes(path)) this.designSelectedDesigns.push(path)
      this.showDesignDesignDialog = false
    },
    onDiscussDesignSelected(path) {
      if (!this.discussSelectedDesigns.includes(path)) this.discussSelectedDesigns.push(path)
      this.showDiscussDesignDialog = false
    },
    onDesignCommandSelected(cmd) {
      this.designPanel.input = cmd + ' ' + this.designPanel.input
      this.showDesignCommandDialog = false
    },
    onDiscussCommandSelected(cmd) {
      this.discussPanel.input = cmd + ' ' + this.discussPanel.input
      this.showDiscussCommandDialog = false
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
  resize: none;
  min-height: 50px;
  max-height: 120px;
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
.fn-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-secondary);
  border-radius: 3px;
  font-size: 10.5px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.fn-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}
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
.badge-action { cursor: pointer; color: var(--accent); }
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
.d-item-actions { display: flex; gap: 2px; margin-left: 8px; }
.d-action-btn {
  width: 22px; height: 22px; border: none; background: transparent;
  color: var(--text-muted); cursor: pointer; border-radius: 3px;
  font-size: 13px; display: flex; align-items: center; justify-content: center;
}
.d-action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.d-action-btn.danger:hover { color: #ef4444; }
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
