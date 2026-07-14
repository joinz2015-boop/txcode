<template>
  <div class="app-container">
    <PlanSessionSidebar
      :sessions="planSessions"
      :current-folder-name="currentPlanSession ? currentPlanSession.folderName : ''"
      :running-session-ids="runningSessionIds"
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
        <ChatPanel
          ref="chatPanel"
          :visible="currentMode === 'code'"
          :panel="codePanel"
          :session-name="currentPlanSession.meta.sessionName || currentPlanSession.folderName"
          :plan-file-path="planFilePath"
          :custom-actions="customActions"
          :status-actions="statusActions"
          :hide-status-bar="true"
          placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
          @send="sendToCodePanel"
          @stop="stopCodePanel"
          @paste-image="(files) => _uploadFiles(files, codePanel)"
          @files-selected="(files) => _uploadFiles(files, codePanel)"
          @remove-media="(id) => removeMedia(codePanel, id)"
          @custom-action="executeCustomAction"
          @status-action="handleStatusAction"
          @fill-dev-plan="fillDevPlan"
          @open-git-changes="gitChangesDialogVisible = true"
          @preview-image="openImagePreview"
          @open-model="openModelSelector('code')"
          @open-test="testDialogVisible = true"
        />

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
          @generate-code="fillDevPlan"
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
    <CreateSubPlanDialog
      :visible.sync="subSchemeVisible"
      @confirm="onSubSchemeConfirm"
      @cancel="subSchemeVisible = false"
    />

    <div v-if="previewImage" class="image-lightbox" @click="closeImagePreview">
      <span class="lightbox-close" @click="closeImagePreview">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="lightbox-image" @click.stop />
    </div>

    <PlanCodeTest
      :visible.sync="testDialogVisible"
      :plan-file-path="planFilePath"
      :folder-name="planFolderName"
      :model-name="codePanel.modelName"
      @test-session-created="onTestSessionCreated"
    />

    <GitChangesDialog :visible.sync="gitChangesDialogVisible" />
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
import CreateSubPlanDialog from '../../../components/pc/plan-code/CreateSubPlanDialog.vue'
import PlanCodeTest from '../../../components/pc/plan-code/planCodeTest.vue'
import GitChangesDialog from '../../../components/pc/plan-code/GitChangesDialog.vue'
import ChatPanel from '../../../components/pc/chat/ChatPanel.vue'
import { ws } from '../../../api/websocket/websocket.js'
import { uploadSingleMedia } from '../../../api/chat/media.js'
import * as configApi from '../../../api/config/config.js'
import { buildChatPayload } from '../../../api/chat/chat.js'
import {
  getTodoStatusIcon, getToolCallName, getToolCallArguments, formatInput,
  renderMarkdown, createThinkItem, createStepItem, withLogId as withLogIdImpl,
} from '../../../lib/render.js'
import { eventBus } from '../../../utils/eventBus.js'
import * as planCodeApi from '../../../api/plan-code/planCodeApi.js'
import * as sessionsApi from '../../../api/session/session.js'

export default {
  name: 'PlanAndCodeView',
  components: { PlanSessionSidebar, PlanEditor, PlanAssistant, ModelSelectDialog, FileSelectDialog, SkillSelectDialog, DesignSelectDialog, CommandDialog, CreateSubPlanDialog, PlanCodeTest, GitChangesDialog, ChatPanel },
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
      previewImage: null,
      customActions: [],
      statusActions: [
        { label: '命令', event: 'open-command' },
        { label: '选择文件', event: 'open-file' },
        { label: '选择Skill', event: 'open-skill' },
        { label: '选择设计', event: 'open-design' },
      ],

      resizeWidth: 420,
      logSeq: 0,
      unsubFileChanged: null,
      testDialogVisible: false,
      testSessionId: '',
      gitChangesDialogVisible: false,
      runningSessionIds: [],
      taskStatus: 'idle',
      unsubRunning: null,
      _renameUnsub: null,
    }
  },

  computed: {
    planFolderName() { return this.currentPlanSession ? this.currentPlanSession.folderName : '' },
    discussSessions() { return this.currentPlanSession ? (this.currentPlanSession.meta.discussSessions || []) : [] },
    stateStoreKey() { return this.planFolderName ? `txcode:plan-code:${this.planFolderName}:state` : '' },
  },

  watch: {
    currentMode(val) {
      if (val === 'plan') this.$nextTick(() => this.$refs.planEditor && this.$refs.planEditor.layout())
    },
    taskStatus() {
      this.updateTitle()
    },
  },

    created() {
      ws.init(); this.loadPlanSessions(); this.loadCustomActions(); this.subscribeRunningSessions(); this._subRename();
    },
  mounted() {
    document.addEventListener('keydown', this.onKeydown)
    this.unsubFileChanged = eventBus.on('file:changed', (data) => {
      if (!this.planFilePath || !data.filePath) return
      const normPlan = this.planFilePath.replace(/\\/g, '/')
      const normFile = data.filePath.replace(/\\/g, '/')
      if (normFile === normPlan || normFile.includes('.txcode/plan-code/')) {
        this.loadPlanContent()
      }
    })
  },
  beforeDestroy() { document.removeEventListener('keydown', this.onKeydown); this.unsubscribeAll(); this.unsubscribeRunning(); if (this.unsubFileChanged) { this.unsubFileChanged(); this.unsubFileChanged = null }; this._unsubRename() },
  activated() { this.resubscribeActive(); this.loadPlanSessions(); this.subscribeRunningSessions(); this.restoreCodeScrollTop(); this._subRename() },
  deactivated() { this.saveCodeScrollTop(); this.unsubscribeAll(); this.unsubscribeRunning(); this._unsubRename() },

  methods: {
    // ====== Helpers ======
    getTodoStatusIcon, getToolCallName, getToolCallArguments, formatInput, renderMarkdown, createThinkItem, createStepItem,

    withLogId(item) { return withLogIdImpl(item, () => ++this.logSeq) },
    createPanel() { return { sessionId: null, logItems: [], input: '', disabled: false, stopping: false, modelName: '', promptTokens: 0, sessionStatus: 'idle', mediaFiles: [], wsUnsubscribe: null } },
    onKeydown(e) { if (e.key === 'Escape' && this.previewImage) this.closeImagePreview() },

    switchMode(mode) { this.currentMode = mode; this.saveState() },

    // ====== Plan Session ======
    async loadPlanSessions() {
      try { const r = await planCodeApi.listPlanSessions(); this.planSessions = r.data || [] } catch (e) { console.error(e) }
    },

    async createPlanSession() {
      const name = '新计划会话'
      try {
        await planCodeApi.createPlanSession(name)
        await this.loadPlanSessions()
        const s = this.planSessions[0]
        if (s) await this.selectPlanSession(s)
      } catch (e) { this.$message.error('创建失败: ' + e.message) }
    },

    async selectPlanSession(session) {
      if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) return
      this.saveCodeScrollTop()
      this.unsubscribeAll()
      this.currentPlanSession = session
      this.currentDiscuss = null
      this.codePanel = this.createPanel()
      this.designPanel = this.createPanel()
      this.discussPanel = this.createPanel()

      const state = this.loadState(session.folderName)
      if (state && state.currentMode) this.currentMode = state.currentMode
      else this.currentMode = 'code'

      await this.loadPlanContent()
      const meta = session.meta
      this.planFilePath = meta.planFilePath || ''

      if (meta.codeSessionId) { this.codePanel.sessionId = meta.codeSessionId; await this.loadMessages(this.codePanel, meta.codeSessionId); this.subscribePanel(this.codePanel, 'code') }
      if (meta.designSessionId) { this.designPanel.sessionId = meta.designSessionId; await this.loadMessages(this.designPanel, meta.designSessionId); this.subscribePanel(this.designPanel, 'design') }
      if (meta.discussSessions && meta.discussSessions.length) await this.switchDiscuss(meta.discussSessions[0], true)
      await this.loadDefaultModel()
      if (this.currentMode === 'plan') this.$nextTick(() => this.$refs.planEditor && this.$refs.planEditor.initEditor())
      if (this.currentMode === 'code') this.restoreCodeScrollTop()
    },

    async renamePlanSession(session, newName) {
      try {
        await planCodeApi.renamePlanSession(session.folderName, newName)
        await this.loadPlanSessions()
        if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) {
          const u = this.planSessions.find(s => s.folderName === session.folderName)
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

    fillDevPlan() {
      this.currentMode = 'code'
      this.$nextTick(() => {
        if (this.planFilePath) {
          this.codePanel.input = `根据 ${this.planFilePath} 方案开发相应功能，先不要修改方案文档。`
        } else {
          this.codePanel.input = '根据方案开发相应功能，先不要修改方案文档。'
        }
      })
    },

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
    async sendToCodePanel() {
      const p = this.codePanel; const c = p.input.trim(); const hasMedia = (p.mediaFiles || []).filter(f => !f.uploading).length > 0
      if ((!c && !hasMedia) || p.disabled) return
      try { await this.ensureSession('codePanel'); this.subscribePanel(p, 'code') } catch { return }
      const payload = buildChatPayload({ input: c, session: { id: p.sessionId }, chatMode: 'code', enableDevLog: false, modelName: p.modelName, mediaFiles: (p.mediaFiles || []).filter(f => !f.uploading && f.filePath) })
      p.input = ''; p.disabled = true; p.stopping = false
      this.pushLogItem(p, { type: 'chat', content: c, mediaFiles: payload.mediaFiles })
      this.scrollCodeToBottom(); ws.send('chat', payload); p.mediaFiles = []
      if (this.currentPlanSession && this.currentPlanSession.meta.sessionName === '新计划会话') {
        ws.send('name_session', { sessionId: p.sessionId, folderName: this.planFolderName, userInput: c })
      }
    },

    stopCodePanel() { if (!this.codePanel.sessionId || this.codePanel.stopping) return; this.codePanel.stopping = true; ws.send('stop', { sessionId: this.codePanel.sessionId }) },

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

      let contextPrefix = ''
      const parentPath = this.currentPlanSession?.meta?.parentPlanPath
      if (parentPath) {
        contextPrefix = `父方案路径：${parentPath}\n`
      }

      ws.send('chat', { message: `${contextPrefix}用户输入: ${c}`, sessionId: p.sessionId, modelName: p.modelName, agent: 'plan', planFilePath: this.planFilePath, mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type })) })
      p.mediaFiles = []
      if (this.currentPlanSession && this.currentPlanSession.meta.sessionName === '新计划会话') {
        ws.send('name_session', { sessionId: p.sessionId, folderName: this.planFolderName, userInput: c })
      }
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
      ws.send('chat', { message: `方案路径：${this.planFilePath}\n\n这个是对这个方案的探讨 你只需要回答用户的问题即可 不需要修改方案 也不要修改代码\n\n用户输入: ${c}`, sessionId: p.sessionId, modelName: p.modelName, agent: 'discuss', mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type })) })
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

    scrollCodeToBottom(force = false) {
      const cp = this.$refs.chatPanel
      if (cp) cp.scrollToBottom(force)
    },
    scrollAfterUpdate(key) {
      if (key === 'code') this.scrollCodeToBottom()
      else if (key === 'design') this.$refs.planAssistant && this.$refs.planAssistant.scrollDesignToBottom()
      else if (key === 'discuss') this.$refs.planAssistant && this.$refs.planAssistant.scrollDiscussToBottom()
    },

    subscribePanel(panel, key) {
      if (!panel.sessionId) return; if (panel.wsUnsubscribe) panel.wsUnsubscribe()
      panel.wsUnsubscribe = ws.subscribe(panel.sessionId, {
        todos: (d) => { this.pushLogItem(panel, { type: 'todos', todos: d.todos }); this.scrollAfterUpdate(key) },
        step: (d) => {
          const hasExecuting = d.toolCalls?.some(tc => tc.status === 'executing');
          if (hasExecuting) {
            panel.logItems = panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            );
            panel.logItems.push(this.withLogId({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration, _executing: true }));
          } else {
            panel.logItems = panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            );
            this.pushLogItem(panel, this.createStepItem(d));
          }
          if (d?.usage?.promptTokens) panel.promptTokens = d.usage.promptTokens;
          this.scrollAfterUpdate(key);
        },
        compact: () => { if (key === 'code') this.loadMessages(panel, panel.sessionId) },
        done: (d) => {
          if (d?.sessionId && panel.sessionId && d.sessionId !== panel.sessionId) return
          panel.logItems = panel.logItems.filter(item => !(item.type === 'step' && item._executing));
          this.stopThinking(panel); panel.sessionStatus = 'completed'
          if (d?.modelName) panel.modelName = d.modelName
          if (d?.usage?.promptTokens) panel.promptTokens = d.usage.promptTokens
          if (d?.response) { this.pushLogItem(panel, this.createThinkItem(d.response)); this.scrollAfterUpdate(key) }
          if (key === 'design') {
            this.loadPlanContent()
          }
        },
        stopped: () => { panel.logItems = panel.logItems.filter(item => !(item.type === 'step' && item._executing)); this.stopThinking(panel); this.pushLogItem(panel, this.createThinkItem('【已停止】')); this.scrollAfterUpdate(key) },
        error: (d) => { panel.logItems = panel.logItems.filter(item => !(item.type === 'step' && item._executing)); this.$message.error(d?.error || '发生错误'); this.stopThinking(panel) },
        running_sessions: (d) => {
          const runningIds = d.runningSessionIds || []
          if (panel.sessionId && runningIds.includes(panel.sessionId)) {
            panel.disabled = true
            panel.sessionStatus = 'processing'
          } else if (!panel.stopping) {
            panel.disabled = false
            panel.sessionStatus = 'idle'
          }
        },
      })
    },

    async loadMessages(panel, sid) {
      try { const r = await sessionsApi.getMessages(sid); panel.logItems = (r.data || []).map(i => { if (i.type === 'think') return this.withLogId(this.createThinkItem(i.content || '')); if (i.type === 'step') return this.withLogId(this.createStepItem(i)); if (i.type === 'chat' && i.mediaFiles) return this.withLogId({ type: 'chat', content: i.content, mediaFiles: i.mediaFiles }); return this.withLogId(i) }) } catch { panel.logItems = [] }
    },

    unsubscribeAll() {
      [this.codePanel, this.designPanel, this.discussPanel].forEach(p => {
        if (p.sessionStatus === 'running') return;
        if (p.wsUnsubscribe) { p.wsUnsubscribe(); p.wsUnsubscribe = null }
      })
    },
    resubscribeActive() {
      if (this.codePanel.sessionId && this.codePanel.sessionStatus !== 'running') this.subscribePanel(this.codePanel, 'code');
      if (this.designPanel.sessionId && this.designPanel.sessionStatus !== 'running') this.subscribePanel(this.designPanel, 'design');
      if (this.discussPanel.sessionId && this.discussPanel.sessionStatus !== 'running') this.subscribePanel(this.discussPanel, 'discuss');
    },

    // ====== Running Sessions ======
    subscribeRunningSessions() {
      if (this.unsubRunning) return
      this.unsubRunning = ws.on('running_sessions', (msg) => {
        const runningIds = msg.data?.runningSessionIds || []
        this.runningSessionIds = runningIds
        this.updateTaskStatus(runningIds)
      })
    },
    unsubscribeRunning() {
      if (this.unsubRunning) { this.unsubRunning(); this.unsubRunning = null }
    },
    _unsubRename() {
      if (this._renameUnsub) { this._renameUnsub(); this._renameUnsub = null }
    },
    _subRename() {
      this._unsubRename()
      this._renameUnsub = ws.on('rename', (msg) => {
        const data = msg.data || msg;
        if (!data.folderName || !data.sessionName) return;
        const session = this.planSessions.find(s => s.folderName === data.folderName);
        if (session) {
          this.renamePlanSession(session, data.sessionName);
        }
      });
    },
    updateTaskStatus(runningIds) {
      const mySessions = [
        this.codePanel.sessionId,
        this.designPanel.sessionId,
        this.currentDiscuss?.sessionId,
        this.currentPlanSession?.meta?.testSessionId,
      ].filter(Boolean)
      if (mySessions.length === 0) { this.taskStatus = 'idle'; return }
      const isRunning = mySessions.some(id => runningIds.includes(id))
      if (isRunning) this.taskStatus = 'running'
      else if (this.taskStatus === 'running') this.taskStatus = 'idle'
    },
    updateTitle() {
      const prefix = this.taskStatus === 'running' ? '⏳ ' : ''
      document.title = `${prefix}TXCode`
    },

    // ====== localStorage State ======
    getStoreKey(folderName) {
      return `txcode:plan-code:${folderName}:state`
    },
    loadState(folderName) {
      if (!folderName) return null
      try {
        const raw = localStorage.getItem(this.getStoreKey(folderName))
        return raw ? JSON.parse(raw) : null
      } catch { return null }
    },
    saveState() {
      if (!this.planFolderName) return
      const key = this.getStoreKey(this.planFolderName)
      const existing = this.loadState(this.planFolderName) || {}
      existing.currentMode = this.currentMode
      localStorage.setItem(key, JSON.stringify(existing))
    },
    saveCodeScrollTop() {
      if (!this.planFolderName) return
      const key = this.getStoreKey(this.planFolderName)
      const existing = this.loadState(this.planFolderName) || {}
      const cp = this.$refs.chatPanel
      existing.codeScrollTop = cp ? cp.getScrollTop() : 0
      localStorage.setItem(key, JSON.stringify(existing))
    },
    restoreCodeScrollTop() {
      if (!this.planFolderName) return
      const state = this.loadState(this.planFolderName)
      if (state && state.codeScrollTop != null) {
        this.$nextTick(() => {
          const cp = this.$refs.chatPanel
          if (cp) cp.setScrollTop(state.codeScrollTop)
        })
      }
    },

    // ====== Model ======
    openModelSelector(target) { this.modelSelectTarget = target; this.modelSelectVisible = true },
    onModelSelected(model) { const n = model.name.split('/').length > 2 ? model.name.split('/').slice(1).join('/') : model.name; this.codePanel.modelName = n; this.designPanel.modelName = n; this.discussPanel.modelName = n; configApi.setConfig('defaultModel', n) },
    async loadDefaultModel() { try { const r = await configApi.getConfig('defaultModel'); if (r.data?.value) { this.codePanel.modelName = r.data.value; this.designPanel.modelName = r.data.value; this.discussPanel.modelName = r.data.value } } catch {} },

    handleStatusAction(event) {
      switch (event) {
        case 'open-model': this.openModelSelector('code'); break
        case 'open-command': this.commandDialogVisible = true; break
        case 'open-file': this.fileSelectVisible = true; break
        case 'open-skill': this.skillSelectVisible = true; break
        case 'open-design': this.designSelectVisible = true; break
        default: break
      }
    },

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
      this.subSchemeVisible = true
    },
    async onSubSchemeConfirm() {
      try {
        const parentPath = this.planFilePath
        await planCodeApi.createPlanSession('新计划会话', parentPath)
        await this.loadPlanSessions()
        const s = this.planSessions[0]
        if (s) await this.selectPlanSession(s)
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

    onTestSessionCreated(sessionId) {
      this.testSessionId = sessionId
      const meta = { ...this.currentPlanSession.meta, testSessionId: sessionId }
      planCodeApi.saveMeta(this.planFolderName, meta)
      this.currentPlanSession.meta = meta
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
  position: absolute; top: 22px; left: 50%; transform: translateX(-50%); z-index: 50;
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

/* Empty state (still used in planAndCodeView) */
.chat-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-textMuted); flex-direction: column; gap: 12px; }
.chat-empty-icon { font-size: 48px; opacity: 0.3; }

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
