<template>
  <div class="app-container">
    <PlanSessionSidebar
      :sessions="planSessions"
      :current-folder-name="currentPlanSession ? currentPlanSession.folderName : ''"
      @create="createPlanSession"
      @select="selectPlanSession"
      @rename="renamePlanSession"
      @delete="deletePlanSession"
    />

    <div class="main-area">
      <div class="mode-float">
        <button class="mode-tab" :class="{ active: currentMode === 'plan' }" @click="switchMode('plan')">方案模式</button>
        <button class="mode-tab" :class="{ active: currentMode === 'code' }" @click="switchMode('code')">编码模式</button>
      </div>

      <div class="content-area" v-if="currentPlanSession">
        <!-- ===== 编码模式：聊天面板 ===== -->
        <div class="chat-panel" :class="{ 'hidden-panel': currentMode !== 'code' }">
          <div class="panel-header">
            <span># {{ currentPlanSession.folderName }}</span>
            <button class="float-dev-btn" @click="fillDevPlan" :disabled="!planFilePath">📋 根据方案开发</button>
          </div>

          <div class="chat-messages" ref="codeLogArea">
            <div v-if="!codePanel.logItems || codePanel.logItems.length === 0" class="chat-empty">
              <span class="chat-empty-icon">💬</span>
              <p>开始对话吧！输入您的问题...</p>
            </div>
            <template v-for="(item, idx) in codePanel.logItems">
              <div v-if="item.type === 'todos'" :key="'c-' + idx" class="todos-list">
                <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
                  <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                  <span class="todo-name">{{ todo.name }}</span>
                </div>
              </div>
              <div v-else-if="item.type === 'chat'" :key="'c-' + idx" class="flex justify-end">
                <div class="user-question">
                  <div v-if="item.mediaFiles && item.mediaFiles.length" class="chat-images">
                    <img v-for="mf in item.mediaFiles" :key="mf.filePath" :src="mf.url || mf.dataUrl || mf.filePath" class="chat-image-thumb" @click.stop="openImagePreview(mf)" />
                  </div>
                  <div>{{ item.content }}</div>
                </div>
              </div>
              <div v-else-if="item.type === 'think'" :key="'c-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
              <template v-else-if="item.type === 'step'" :key="'c-' + idx">
                <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
                <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </div>
              </template>
              <div v-else-if="item.type === 'system'" :key="'c-' + idx" class="system-msg">{{ item.content }}</div>
            </template>
            <div class="build-info" v-if="codePanel.modelName">
              <span class="icon">▣</span> Build · {{ codePanel.modelName }}
            </div>
          </div>

          <div class="input-block">
            <ImagePreviewList
              v-if="codePanel.mediaFiles && codePanel.mediaFiles.length"
              :files="codePanel.mediaFiles"
              :disabled="codePanel.disabled"
              @remove="(id) => removeMedia(codePanel, id)"
            />
            <div class="input-wrapper">
              <ResizableTextarea
                v-model="codePanel.input"
                :rows="5"
                placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
                :disabled="codePanel.disabled"
                class="code-input-area"
                @keydown.enter.native="handleCodeKeydown"
                @paste-image="(files) => handleCodePasteImages(files)"
              />
              <input type="file" accept="image/*" multiple ref="codeImgInput" style="display:none" @change="handleCodeImageSelected" />
              <div class="input-actions">
                <button
                  v-for="action in customActions"
                  :key="action.id"
                  class="action-btn btn-custom"
                  @click="executeCustomAction(action)"
                  :disabled="codePanel.disabled"
                >{{ action.name }}</button>
                <button class="action-btn btn-upload" @click="handleCodeImageUpload" :disabled="codePanel.disabled">图片</button>
                <button v-if="codePanel.disabled && !codePanel.stopping" class="action-btn btn-stop" @click="stopCodePanel">■ 停止</button>
                <button v-else-if="codePanel.stopping" class="action-btn btn-stop" disabled>停止中...</button>
                <button v-else class="action-btn btn-send" :disabled="!codePanel.input.trim() && (!codePanel.mediaFiles || !codePanel.mediaFiles.length)" @click="sendToCodePanel">发送</button>
              </div>
            </div>
          </div>

          <div class="status-bar">
            <span :class="codePanel.disabled ? 'status-thinking' : 'status-ready'">
              <span v-if="codePanel.disabled" class="thinking-spinner"></span>
              {{ codePanel.disabled ? '思考中' : '✓ 就绪' }}
            </span>
            <span class="sep">|</span>
            <span class="status-action" @click="openModelSelector('code')">模型: {{ codePanel.modelName || '-' }} ▾</span>
            <span class="sep">|</span>
            <span>会话: {{ codePanel.sessionId ? codePanel.sessionId.slice(0, 8) : '未创建' }}</span>
            <span class="sep">|</span>
            <span>token: {{ codePanel.promptTokens || 0 }}</span>
            <span class="sep">|</span>
            <span class="status-action" @click="commandDialogVisible = true" @mousedown.prevent>命令</span>
            <span class="sep">|</span>
            <span class="status-action" @click="fileSelectVisible = true" @mousedown.prevent>选择文件</span>
            <span class="sep">|</span>
            <span class="status-action" @click="skillSelectVisible = true" @mousedown.prevent>选择Skill</span>
            <span class="sep">|</span>
            <span class="status-action" @click="designSelectVisible = true" @mousedown.prevent>选择设计</span>
          </div>
        </div>

        <!-- ===== 方案模式：编辑器 + 助手 ===== -->
        <PlanEditor
          ref="planEditor"
          :visible="currentMode === 'plan'"
          :content="planContent"
          :plan-file-path="planFilePath"
          @save="savePlanContent"
          @refresh="loadPlanContent"
          @export="handleExport"
          @create-sub-scheme="handleCreateSubScheme"
        />

        <div class="resize-handle" :class="{ visible: currentMode === 'plan' }" @mousedown="onResizeStart" ref="resizeHandleEl"></div>

        <PlanAssistant
          ref="planAssistant"
          :visible="currentMode === 'plan'"
          :width="resizeWidth"
          :design-panel="designPanel"
          :discuss-panel="discussPanel"
          :discuss-sessions="discussSessions"
          :current-discuss="currentDiscuss"
          :plan-file-path="planFilePath"
          @sendDesign="sendDesignMessage"
          @stopDesign="stopDesignPanel"
          @sendDiscuss="sendDiscussMessage"
          @stopDiscuss="stopDiscussPanel"
          @switchDiscuss="switchDiscuss"
          @createDiscuss="createDiscuss"
          @renameDiscuss="renameDiscuss"
          @deleteDiscuss="deleteDiscuss"
          @openModel="openModelSelector('design')"
        />
      </div>

      <div class="content-area empty-content" v-else>
        <div class="chat-empty" style="height:100%">
          <span class="chat-empty-icon">📋</span>
          <p>选择或创建一个计划会话开始</p>
          <button class="sidebar-new-btn" style="margin-top:12px;font-size:13px;padding:6px 16px;" @click="createPlanSession">+ 新建会话</button>
        </div>
      </div>
    </div>

    <ModelSelectDialog
      :visible.sync="modelSelectVisible"
      :current-model="modelSelectTarget === 'code' ? codePanel.modelName : designPanel.modelName"
      @select="onModelSelected"
    />
    <FileSelectDialog
      :visible.sync="fileSelectVisible"
      @select="onFileSelected"
      @close="fileSelectVisible = false"
    />
    <SkillSelectDialog
      :visible.sync="skillSelectVisible"
      @select="onSkillSelected"
      @close="skillSelectVisible = false"
    />
    <DesignSelectDialog
      :visible.sync="designSelectVisible"
      @select="onDesignSelected"
      @close="designSelectVisible = false"
    />
    <CommandDialog
      :visible.sync="commandDialogVisible"
      @execute="handleExecuteCommand"
    />
    <SubSchemeDialog
      :visible.sync="subSchemeVisible"
      :category="planFolderName"
      :default-name="subSchemeDefaultName"
      @confirm="onSubSchemeConfirm"
      @cancel="subSchemeVisible = false"
    />

    <div v-if="previewImage" class="image-lightbox" @click="closeImagePreview">
      <span class="lightbox-close" @click="closeImagePreview">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import PlanSessionSidebar from '../../../components/pc/plan-code/PlanSessionSidebar.vue'
import PlanEditor from '../../../components/pc/plan-code/PlanEditor.vue'
import PlanAssistant from '../../../components/pc/plan-code/PlanAssistant.vue'
import ModelSelectDialog from '../../../components/pc/model/ModelSelectDialog.vue'
import FileSelectDialog from '../../../components/pc/file/FileSelectDialog.vue'
import SkillSelectDialog from '../../../components/pc/skill/SkillSelectDialog.vue'
import DesignSelectDialog from '../../../components/pc/design/DesignSelectDialog.vue'
import CommandDialog from '../../../components/pc/common/CommandDialog.vue'
import SubSchemeDialog from '../../../components/pc/workflow/SubSchemeDialog.vue'
import ImagePreviewList from '../../../components/pc/chat/ImagePreviewList.vue'
import ResizableTextarea from '../../../components/pc/chat/ResizableTextarea.vue'
import { ws } from '../../../api/websocket/websocket.js'
import { uploadSingleMedia } from '../../../api/chat/media.js'
import * as configApi from '../../../api/config/config.js'
import { buildChatPayload } from '../../../api/chat/chat.js'
import {
  getTodoStatusIcon, getToolCallName, getToolCallArguments, formatInput,
  renderMarkdown, createThinkItem, createStepItem, withLogId as withLogIdImpl,
} from '../../../lib/render.js'
import { scrollToBottom } from '../../../utils/scroll'
import * as planCodeApi from '../../../api/plan-code/planCodeApi.js'
import * as sessionsApi from '../../../api/session/session.js'

export default {
  name: 'PlanAndCodeView',
  components: { PlanSessionSidebar, PlanEditor, PlanAssistant, ModelSelectDialog, FileSelectDialog, SkillSelectDialog, DesignSelectDialog, CommandDialog, SubSchemeDialog, ImagePreviewList, ResizableTextarea },
  MAX_LOG_ITEMS: 400,

  data() {
    return {
      currentMode: 'code',
      planSessions: [],
      currentPlanSession: null,
      planContent: '',
      planFilePath: '',

      codePanel: this.createPanel(),
      designPanel: this.createPanel(),
      discussPanel: this.createPanel(),

      currentDiscuss: null,

      modelSelectVisible: false,
      modelSelectTarget: 'code',
      fileSelectVisible: false,
      skillSelectVisible: false,
      designSelectVisible: false,
      commandDialogVisible: false,
      subSchemeVisible: false,
      subSchemeDefaultName: '',
      previewImage: null,
      customActions: [],

      resizeWidth: 420,
      logSeq: 0,
    }
  },

  computed: {
    planFolderName() { return this.currentPlanSession ? this.currentPlanSession.folderName : '' },
    discussSessions() { return this.currentPlanSession ? (this.currentPlanSession.meta.discussSessions || []) : [] },
  },

  watch: {
    currentMode(val) {
      if (val === 'plan') this.$nextTick(() => this.$refs.planEditor && this.$refs.planEditor.layout())
    },
  },

    created() { ws.init(); this.loadPlanSessions(); this.loadCustomActions() },
  mounted() { document.addEventListener('keydown', this.onKeydown) },
  beforeDestroy() { document.removeEventListener('keydown', this.onKeydown); this.unsubscribeAll() },
  activated() { this.resubscribeActive(); this.loadPlanSessions() },
  deactivated() { this.unsubscribeAll() },

  methods: {
    // ====== Helpers ======
    getTodoStatusIcon, getToolCallName, getToolCallArguments, formatInput, renderMarkdown, createThinkItem, createStepItem,

    withLogId(item) { return withLogIdImpl(item, () => ++this.logSeq) },
    createPanel() { return { sessionId: null, logItems: [], input: '', disabled: false, stopping: false, modelName: '', promptTokens: 0, sessionStatus: 'idle', mediaFiles: [], wsUnsubscribe: null } },
    onKeydown(e) { if (e.key === 'Escape' && this.previewImage) this.closeImagePreview() },

    switchMode(mode) { this.currentMode = mode },

    // ====== Plan Session ======
    async loadPlanSessions() {
      try { const r = await planCodeApi.listPlanSessions(); this.planSessions = r.data || [] } catch (e) { console.error(e) }
    },

    async createPlanSession() {
      const name = '新计划会话'
      try {
        await planCodeApi.createPlanSession(name)
        await this.loadPlanSessions()
        const s = this.planSessions.find(x => x.folderName === name)
        if (s) await this.selectPlanSession(s)
      } catch (e) { this.$message.error('创建失败: ' + e.message) }
    },

    async selectPlanSession(session) {
      if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) return
      this.unsubscribeAll()
      this.currentPlanSession = session
      this.currentDiscuss = null
      this.codePanel = this.createPanel()
      this.designPanel = this.createPanel()
      this.discussPanel = this.createPanel()

      await this.loadPlanContent()
      const meta = session.meta
      this.planFilePath = meta.planFilePath || ''

      if (meta.codeSessionId) { this.codePanel.sessionId = meta.codeSessionId; await this.loadMessages(this.codePanel, meta.codeSessionId); this.subscribePanel(this.codePanel, 'code') }
      if (meta.designSessionId) { this.designPanel.sessionId = meta.designSessionId; await this.loadMessages(this.designPanel, meta.designSessionId); this.subscribePanel(this.designPanel, 'design') }
      if (meta.discussSessions && meta.discussSessions.length) await this.switchDiscuss(meta.discussSessions[0], true)
      await this.loadDefaultModel()
      if (this.currentMode === 'plan') this.$nextTick(() => this.$refs.planEditor && this.$refs.planEditor.initEditor())
    },

    async renamePlanSession(session, newName) {
      try {
        await planCodeApi.renamePlanSession(session.folderName, newName)
        await this.loadPlanSessions()
        if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) {
          const u = this.planSessions.find(s => s.folderName === newName)
          if (u) { this.currentPlanSession = u; this.planFilePath = u.meta.planFilePath || '' }
        }
      } catch (e) { this.$message.error('重命名失败: ' + e.message) }
    },

    async deletePlanSession(session) {
      try {
        await planCodeApi.deletePlanSession(session.folderName)
        if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) {
          this.unsubscribeAll()
          this.currentPlanSession = null; this.codePanel = this.createPanel(); this.designPanel = this.createPanel()
          this.discussPanel = this.createPanel(); this.planContent = ''; this.planFilePath = ''; this.currentDiscuss = null
        }
        await this.loadPlanSessions()
      } catch (e) { this.$message.error('删除失败: ' + e.message) }
    },

    // ====== Plan Content ======
    async loadPlanContent() {
      if (!this.planFolderName) { this.planContent = ''; return }
      try { const r = await planCodeApi.readPlan(this.planFolderName); this.planContent = (r.data && r.data.content) || '' } catch { this.planContent = '' }
    },

    async savePlanContent(content) {
      if (!this.planFolderName) return
      try {
        if (!content && this.$refs.planEditor) content = this.$refs.planEditor.getValue()
        await planCodeApi.savePlan(this.planFolderName, content)
        this.planContent = content
        this.$message.success('方案已保存')
      } catch (e) { this.$message.error('保存失败: ' + e.message) }
    },

    fillDevPlan() { this.currentMode = 'code'; this.$nextTick(() => { this.codePanel.input = '根据方案开发' }) },

    // ====== Lazy Session ======
    async ensureSession(panelKey) {
      let sid = this[panelKey].sessionId
      if (!sid) {
        const r = await sessionsApi.createSession(this.planFolderName)
        sid = r.data.id
        this[panelKey].sessionId = sid
        const meta = { ...this.currentPlanSession.meta }
        if (panelKey === 'codePanel') meta.codeSessionId = sid
        else if (panelKey === 'designPanel') meta.designSessionId = sid
        meta.updatedAt = new Date().toISOString()
        await planCodeApi.saveMeta(this.planFolderName, meta)
        this.currentPlanSession.meta = meta
      }
      return sid
    },

    // ====== Code Panel ======
    handleCodeKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const t = e.target; const s = t.selectionStart; const end = t.selectionEnd
          this.codePanel.input = this.codePanel.input.substring(0, s) + '\n' + this.codePanel.input.substring(end)
          this.$nextTick(() => { t.selectionStart = t.selectionEnd = s + 1 })
        } else { e.preventDefault(); this.sendToCodePanel() }
      }
    },
    handleCodePasteImages(files) {
      if (this.codePanel.disabled) return
      this._uploadFiles(files, this.codePanel)
    },

    async sendToCodePanel() {
      const p = this.codePanel; const c = p.input.trim(); const hasMedia = (p.mediaFiles || []).filter(f => !f.uploading).length > 0
      if ((!c && !hasMedia) || p.disabled) return
      try { await this.ensureSession('codePanel'); this.subscribePanel(p, 'code') } catch { return }
      const payload = buildChatPayload({ input: c, session: { id: p.sessionId }, chatMode: 'code', enableDevLog: false, modelName: p.modelName, mediaFiles: (p.mediaFiles || []).filter(f => !f.uploading && f.filePath) })
      p.input = ''; p.disabled = true; p.stopping = false
      this.pushLogItem(p, { type: 'chat', content: c, mediaFiles: payload.mediaFiles })
      this.scrollCodeToBottom(); ws.send('chat', payload); p.mediaFiles = []
    },

    stopCodePanel() { if (!this.codePanel.sessionId || this.codePanel.stopping) return; this.codePanel.stopping = true; ws.send('stop', { sessionId: this.codePanel.sessionId }) },
    handleCodeImageUpload() { const el = this.$refs.codeImgInput; if (el) (Array.isArray(el) ? el[0] : el).click() },
    async handleCodeImageSelected(e) { const files = e.target.files; if (!files || !files.length) return; const a = Array.from(files); e.target.value = ''; await this._uploadFiles(a, this.codePanel) },

    async _uploadFiles(files, panel) {
      const max = 5; const cur = (panel.mediaFiles || []).length; const rem = max - cur
      if (rem <= 0) { this.$message.warning('最多上传5张图片'); return }
      const n = Math.min(files.length, rem); if (!panel.mediaFiles) panel.mediaFiles = []
      for (let i = 0; i < n; i++) { const f = files[i]; panel.mediaFiles.push({ id: Date.now() + '_' + i, name: f.name, dataUrl: '', filePath: '', type: f.type, uploading: true }) }
      for (let i = 0; i < n; i++) {
        const idx = panel.mediaFiles.length - n + i
        try { const r = await uploadSingleMedia(files[i]); Object.assign(panel.mediaFiles[idx], { dataUrl: r.dataUrl, filePath: r.filePath, type: r.type, uploading: false }) } catch { panel.mediaFiles.splice(idx, 1) }
      }
    },
    removeMedia(panel, id) { const i = (panel.mediaFiles || []).findIndex(f => f.id === id); if (i > -1) panel.mediaFiles.splice(i, 1) },

    // ====== Design Panel ======
    async sendDesignMessage() {
      const p = this.designPanel; const c = p.input.trim(); const hasMedia = (p.mediaFiles || []).length > 0
      if ((!c && !hasMedia) || p.disabled) return
      try { await this.ensureSession('designPanel'); this.subscribePanel(p, 'design') } catch { return }
      const sentMediaFiles = (p.mediaFiles || []).filter(f => !f.uploading && f.filePath).map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))
      p.input = ''; p.disabled = true; p.stopping = false
      this.pushLogItem(p, { type: 'chat', content: c, mediaFiles: sentMediaFiles })
      this.$refs.planAssistant && this.$refs.planAssistant.scrollDesignToBottom()
      ws.send('chat', { message: `先在 ${this.planFilePath} 生成方案，先不要修改代码。\n\n用户输入: ${c}`, sessionId: p.sessionId, modelName: p.modelName, mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type })) })
      p.mediaFiles = []
    },
    stopDesignPanel() { if (!this.designPanel.sessionId || this.designPanel.stopping) return; this.designPanel.stopping = true; ws.send('stop', { sessionId: this.designPanel.sessionId }) },

    // ====== Discuss Panel ======
    async createDiscuss() {
      const title = `探讨${(this.discussSessions.length + 1)}`
      try {
        const r = await sessionsApi.createSession(title)
        const d = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), sessionId: r.data.id, title, createdAt: new Date().toISOString() }
        const meta = { ...this.currentPlanSession.meta }; meta.discussSessions = [...(meta.discussSessions || []), d]; meta.updatedAt = new Date().toISOString()
        await planCodeApi.saveMeta(this.planFolderName, meta); this.currentPlanSession.meta = meta
        await this.switchDiscuss(d)
      } catch (e) { this.$message.error('创建探讨失败: ' + e.message) }
    },

    async switchDiscuss(disc) {
      if (!disc) return
      if (this.discussPanel.wsUnsubscribe) { this.discussPanel.wsUnsubscribe(); this.discussPanel.wsUnsubscribe = null }
      this.currentDiscuss = disc; this.discussPanel = this.createPanel(); this.discussPanel.sessionId = disc.sessionId
      await this.loadMessages(this.discussPanel, disc.sessionId); this.subscribePanel(this.discussPanel, 'discuss')
    },

    async sendDiscussMessage() {
      const p = this.discussPanel; const c = p.input.trim(); const hasMedia = (p.mediaFiles || []).length > 0
      if ((!c && !hasMedia) || p.disabled || !p.sessionId) return
      this.subscribePanel(p, 'discuss')
      const sentMediaFiles = (p.mediaFiles || []).filter(f => !f.uploading && f.filePath).map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))
      p.input = ''; p.disabled = true; p.stopping = false
      this.pushLogItem(p, { type: 'chat', content: c, mediaFiles: sentMediaFiles })
      this.$refs.planAssistant && this.$refs.planAssistant.scrollDiscussToBottom()
      ws.send('chat', { message: `方案路径：${this.planFilePath}\n\n这个是对这个方案的探讨 你只需要回答用户的问题即可 不需要修改方案 也不要修改代码\n\n用户输入: ${c}`, sessionId: p.sessionId, modelName: p.modelName, mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type })) })
      p.mediaFiles = []
    },
    stopDiscussPanel() { if (!this.discussPanel.sessionId || this.discussPanel.stopping) return; this.discussPanel.stopping = true; ws.send('stop', { sessionId: this.discussPanel.sessionId }) },

    async renameDiscuss(disc, newTitle) {
      const meta = { ...this.currentPlanSession.meta }; const i = meta.discussSessions.findIndex(d => d.id === disc.id)
      if (i > -1) { meta.discussSessions[i].title = newTitle; meta.updatedAt = new Date().toISOString(); await planCodeApi.saveMeta(this.planFolderName, meta); this.currentPlanSession.meta = meta; if (this.currentDiscuss && this.currentDiscuss.id === disc.id) this.currentDiscuss.title = newTitle }
    },

    async deleteDiscuss(disc) {
      const meta = { ...this.currentPlanSession.meta }; meta.discussSessions = meta.discussSessions.filter(d => d.id !== disc.id); meta.updatedAt = new Date().toISOString()
      if (disc.sessionId) { try { await sessionsApi.deleteSession(disc.sessionId) } catch {} }
      await planCodeApi.saveMeta(this.planFolderName, meta); this.currentPlanSession.meta = meta
      if (this.currentDiscuss && this.currentDiscuss.id === disc.id) {
        if (this.discussPanel.wsUnsubscribe) { this.discussPanel.wsUnsubscribe(); this.discussPanel.wsUnsubscribe = null }
        this.currentDiscuss = null; this.discussPanel = this.createPanel()
        if (meta.discussSessions.length) await this.switchDiscuss(meta.discussSessions[0])
      }
    },

    // ====== Shared Panels ======
    pushLogItem(panel, item) { panel.logItems.push(this.withLogId(item)); const max = this.$options.MAX_LOG_ITEMS; if (panel.logItems.length > max) panel.logItems.splice(0, panel.logItems.length - max) },
    stopThinking(panel) { panel.disabled = false; panel.stopping = false; panel.sessionStatus = 'idle' },

    scrollCodeToBottom() { this.$nextTick(() => { const el = this.$refs.codeLogArea; if (el) scrollToBottom(el) }) },
    scrollAfterUpdate(key) {
      if (key === 'code') this.scrollCodeToBottom()
      else if (key === 'design') this.$refs.planAssistant && this.$refs.planAssistant.scrollDesignToBottom()
      else if (key === 'discuss') this.$refs.planAssistant && this.$refs.planAssistant.scrollDiscussToBottom()
    },

    subscribePanel(panel, key) {
      if (!panel.sessionId) return; if (panel.wsUnsubscribe) panel.wsUnsubscribe()
      panel.wsUnsubscribe = ws.subscribe(panel.sessionId, {
        todos: (d) => { this.pushLogItem(panel, { type: 'todos', todos: d.todos }); this.scrollAfterUpdate(key) },
        step: (d) => { this.pushLogItem(panel, this.createStepItem(d)); if (d?.usage?.promptTokens) panel.promptTokens = d.usage.promptTokens; this.scrollAfterUpdate(key) },
        compact: () => { if (key === 'code') this.loadMessages(panel, panel.sessionId) },
        done: (d) => {
          if (d?.sessionId && panel.sessionId && d.sessionId !== panel.sessionId) return
          this.stopThinking(panel); panel.sessionStatus = 'completed'
          if (d?.modelName) panel.modelName = d.modelName
          if (d?.usage?.promptTokens) panel.promptTokens = d.usage.promptTokens
          if (d?.response) { this.pushLogItem(panel, this.createThinkItem(d.response)); this.scrollAfterUpdate(key) }
        },
        stopped: () => { this.stopThinking(panel); this.pushLogItem(panel, this.createThinkItem('【已停止】')); this.scrollAfterUpdate(key) },
        error: (d) => { this.$message.error(d?.error || '发生错误'); this.stopThinking(panel) },
      })
    },

    async loadMessages(panel, sid) {
      try { const r = await sessionsApi.getMessages(sid); panel.logItems = (r.data || []).map(i => { if (i.type === 'think') return this.withLogId(this.createThinkItem(i.content || '')); if (i.type === 'step') return this.withLogId(this.createStepItem(i)); if (i.type === 'chat' && i.mediaFiles) return this.withLogId({ type: 'chat', content: i.content, mediaFiles: i.mediaFiles }); return this.withLogId(i) }) } catch { panel.logItems = [] }
    },

    unsubscribeAll() { [this.codePanel, this.designPanel, this.discussPanel].forEach(p => { if (p.wsUnsubscribe) { p.wsUnsubscribe(); p.wsUnsubscribe = null } }) },
    resubscribeActive() { if (this.codePanel.sessionId) this.subscribePanel(this.codePanel, 'code'); if (this.designPanel.sessionId) this.subscribePanel(this.designPanel, 'design'); if (this.discussPanel.sessionId) this.subscribePanel(this.discussPanel, 'discuss') },

    // ====== Model ======
    openModelSelector(target) { this.modelSelectTarget = target; this.modelSelectVisible = true },
    onModelSelected(model) { const n = model.name.split('/').length > 2 ? model.name.split('/').slice(1).join('/') : model.name; this.codePanel.modelName = n; this.designPanel.modelName = n; this.discussPanel.modelName = n; configApi.setConfig('defaultModel', n) },
    async loadDefaultModel() { try { const r = await configApi.getConfig('defaultModel'); if (r.data?.value) { this.codePanel.modelName = r.data.value; this.designPanel.modelName = r.data.value; this.discussPanel.modelName = r.data.value } } catch {} },

    // ====== File/Skill ======
    onFileSelected(path) { this.codePanel.input = this.codePanel.input + path + ' '; this.fileSelectVisible = false },
    onSkillSelected(name) { this.codePanel.input = '[Skill:' + name + '] ' + this.codePanel.input; this.skillSelectVisible = false },

    // ====== Image ======
    openImagePreview(mf) { this.previewImage = mf },
    closeImagePreview() { this.previewImage = null },

    onDesignSelected(design) {
      const tag = `[设计:${design.name}](${design.path}) `
      this.codePanel.input += tag
      this.designSelectVisible = false
    },
    handleExecuteCommand(cmd) {
      this.codePanel.input = cmd + ' '
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.code-input-area textarea')
        if (textarea) textarea.focus()
      })
    },

    async loadCustomActions() {
      try {
        const { request } = await import('../../../api/request.js')
        const r = await request('GET', '/custom_action/list_custom_action?type=code')
        this.customActions = r.data || []
      } catch (e) { console.error('Load custom actions failed:', e) }
    },
    executeCustomAction(action) {
      this.codePanel.input = action.prompt
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.code-input-area textarea')
        if (textarea) textarea.focus()
        if (action.auto_send) this.sendToCodePanel()
      })
    },

    handleCreateSubScheme() {
      this.subSchemeDefaultName = this.planFolderName + '_子方案'
      this.subSchemeVisible = true
    },
    async onSubSchemeConfirm(subName) {
      try {
        await planCodeApi.createPlanSession(subName)
        const r = await planCodeApi.listPlanSessions()
        const sessions = r.data || []
        const newSession = sessions.find(s => s.folderName === subName)
        if (newSession) {
          const updatedMeta = { ...newSession.meta, parentPlanPath: this.planFilePath, updatedAt: new Date().toISOString() }
          await planCodeApi.saveMeta(subName, updatedMeta)
        }
        await this.loadPlanSessions()
        const refreshed = this.planSessions.find(s => s.folderName === subName)
        if (refreshed) await this.selectPlanSession(refreshed)
        this.subSchemeVisible = false
      } catch (e) { this.$message.error('创建子方案失败: ' + e.message) }
    },
    handleExport() {
      if (!this.planFilePath) { this.$message.warning('请先选择方案'); return }
      const fileName = (this.planFilePath.split('/').pop() || '方案.md')
      const url = `/api/file/download_file?path=${encodeURIComponent(this.planFilePath)}`
      const a = document.createElement('a'); a.href = url; a.download = fileName
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    },

    // ====== Resize ======
    onResizeStart(e) {
      const startX = e.clientX; const startW = this.resizeWidth
      const move = (ev) => { this.resizeWidth = Math.max(280, Math.min(700, startW + (startX - ev.clientX))) }
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; this.$refs.planEditor && this.$refs.planEditor.layout() }
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
      document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
    },
  },
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100%;
  background: var(--color-panel);
  overflow: hidden;
}

.main-area { flex: 1; position: relative; overflow: hidden; min-width: 0; }

.mode-float {
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%); z-index: 50;
  display: flex; align-items: center; gap: 2px;
  background: var(--color-panelHeader); backdrop-filter: blur(12px);
  border: 1px solid var(--color-border); border-radius: 10px; padding: 3px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.mode-tab {
  padding: 5px 18px; font-size: 12px; font-family: inherit; cursor: pointer;
  background: transparent; border: none; border-radius: 7px;
  color: var(--color-textMuted); transition: all 0.2s; white-space: nowrap;
}
.mode-tab:hover { color: var(--color-textMain); background: rgba(255,255,255,0.04); }
.mode-tab.active { background: var(--color-accent); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.35); }

.content-area { flex: 1; display: flex; overflow: hidden; padding: 16px; gap: 8px; height: 100%; }
.empty-content { align-items: center; justify-content: center; }

/* Chat Panel */
.chat-panel { flex: 1; display: flex; flex-direction: column; background: var(--color-panelHeader); border: 1px solid var(--color-contentBg); border-radius: 8px; min-width: 0; overflow: hidden; }
.chat-panel.hidden-panel { display: none; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--color-contentBg); font-size: 13px; font-weight: 600; color: var(--color-textMain); flex-shrink: 0; }
.float-dev-btn { display: flex; align-items: center; gap: 4px; padding: 5px 14px; font-size: 12px; font-family: inherit; cursor: pointer; background: var(--color-accent); color: #fff; border: none; border-radius: 6px; box-shadow: 0 2px 8px rgba(99,102,241,0.3); transition: all 0.2s; flex-shrink: 0; }
.float-dev-btn:hover { background: #818cf8; box-shadow: 0 4px 14px rgba(99,102,241,0.45); }
.float-dev-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.chat-messages { flex: 1; overflow-y: auto; padding: 16px 40px 24px; font-size: 14px; line-height: 1.6; }
.chat-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-textMuted); flex-direction: column; gap: 12px; }
.chat-empty-icon { font-size: 48px; opacity: 0.3; }

.user-question { color: var(--color-accent); font-weight: 600; border: 1px solid var(--color-accent); padding: 12px 16px; margin: 12px 0 12px auto; border-radius: 10px; display: inline-block; max-width: 70%; word-break: break-word; }
.ai-thought { color: var(--color-textMain); margin-bottom: 16px; line-height: 1.6; }
.log-mute { color: var(--color-textMuted); margin-bottom: 12px; font-size: 13px; }
.tool-success { color: var(--color-success, #22c55e); }
.tool-fail { color: var(--color-danger, #ef4444); }
.tool-input { color: var(--color-accent); margin-left: 6px; }
.build-info { color: var(--color-textMuted); display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; }
.build-info .icon { color: var(--color-accent); font-size: 11px; }
.todos-list { margin-bottom: 16px; color: var(--color-textMain); }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 13px; }
.system-msg { color: var(--color-textMuted); margin-bottom: 12px; font-size: 13px; font-style: italic; }

.input-block {
  background-color: var(--color-inputBg);
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.input-wrapper { position: relative; flex: 1; }

.code-input-area { flex: 1; }

.input-actions {
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

.action-btn { font-size: 12px; padding: 5px 12px; border-radius: 5px; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-upload { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-upload:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-upload:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-custom { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-custom:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-custom:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: var(--color-danger, #ef4444); color: #fff; }
.btn-send { background: var(--color-accent); color: #fff; }
.btn-send:hover { background: #818cf8; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

.status-bar { display: flex; gap: 8px; align-items: center; padding: 6px 16px; font-size: 12px; color: var(--color-textMuted); border-top: 1px solid var(--color-border); flex-shrink: 0; flex-wrap: wrap; }
.sep { color: var(--color-border); }
.status-ready { color: var(--color-success); }
.status-thinking { color: var(--color-accent); display: flex; align-items: center; gap: 6px; }
.status-action { cursor: pointer; }
.status-action:hover { color: var(--color-accent); }
.thinking-spinner { width: 10px; height: 10px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.chat-images { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.chat-image-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; }

/* Resize */
.resize-handle { width: 4px; cursor: col-resize; background: transparent; flex-shrink: 0; transition: background 0.15s; display: none; }
.resize-handle.visible { display: block; }
.resize-handle:hover { background: var(--color-accent); }

/* Lightbox */
.image-lightbox { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.lightbox-close { position: absolute; top: 20px; right: 30px; font-size: 30px; color: #fff; cursor: pointer; }
.lightbox-image { max-width: 90%; max-height: 90%; border-radius: 8px; }
.sidebar-new-btn { font-size: 12px; padding: 5px 12px; background: var(--color-accent); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; }
.sidebar-new-btn:hover { background: #818cf8; }
</style>
