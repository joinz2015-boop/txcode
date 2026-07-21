<template>
  <div class="coding-view">
    <DesktopPlanSessionSidebar
      :sessions="planSessions"
      :currentFolderName="currentPlanSession ? currentPlanSession.folderName : ''"
      :runningSessionIds="runningSessionIds"
      @create="createPlanSession"
      @select="selectPlanSession"
      @rename="onSidebarRename"
      @delete="onSidebarDelete"
    />

    <div class="main-area">
      <div v-if="currentPlanSession" class="content-panels" :class="{ 'plan-gap': currentMode === 'plan' }">
        <DesktopCodingPanel
          ref="codingPanel"
          v-show="currentMode === 'code'"
          :currentModel="currentModel"
          :currentSession="currentPlanSession"
          :runningSessionIds="runningSessionIds"
          :planFilePath="planFilePath"
          :customActions="customActions"
          @open-model-select="handleOpenModelSelect('code')"
          @custom-action="executeCustomAction"
          @open-git-changes="gitChangesDialogVisible = true"
          @open-test="handleOpenTest"
          @preview-image="openImagePreview"
        />

        <template v-if="currentMode === 'plan'">
          <DesktopPlanEditor
            ref="planEditor"
            :folderName="planFolderName"
            :filePath="planFilePath"
            :planFilePath="planFilePath"
            :content="planContent"
            :editorFlex="'1'"
            @refresh="loadPlanContent"
            @export="exportPlan"
            @create-sub="createSubPlan"
            @generate-code="fillDevPlan"
          />
          <div class="resize-handle" @mousedown="onResizeStart" ref="resizeHandleEl"></div>
          <DesktopAssistantPanel
            ref="assistantPanel"
            :panelWidth="assistantWidth"
            :currentModel="currentModel"
            :currentSession="currentPlanSession"
            :planFilePath="planFilePath"
            :runningSessionIds="runningSessionIds"
            @planUpdated="loadPlanContent"
            @open-model-select="handleOpenModelSelect('design')"
          />
        </template>
      </div>

      <div v-else class="empty-state">
        <span class="empty-icon">📋</span>
        <p>选择或创建一个计划会话开始</p>
        <button class="sidebar-new-btn" style="margin-top:12px;font-size:13px;padding:6px 16px;" @click="createPlanSession">+ 新建会话</button>
      </div>
    </div>

    <DesktopModelSelectDialog
      v-if="modelSelectVisible"
      :currentModel="currentModel"
      @close="modelSelectVisible = false"
      @select="onModelSelected"
    />

    <DesktopCreateSubPlanDialog
      v-if="subPlanDialogVisible"
      @close="subPlanDialogVisible = false"
      @confirm="onSubPlanConfirm"
    />

    <DesktopGitChangesDialog
      v-if="gitChangesDialogVisible"
      @close="gitChangesDialogVisible = false"
    />

    <DesktopPlanCodeTest
      v-if="testDialogVisible"
      :currentModel="currentModel"
      :planSession="currentPlanSession"
      :planFilePath="planFilePath"
      :projectPath="desktopState.currentProject?.path || ''"
      @close="testDialogVisible = false"
    />

    <div v-if="previewImage" class="image-lightbox" @click="closeImagePreview">
      <span class="lightbox-close" @click="closeImagePreview">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import DesktopCodingPanel from '@/components/coding/DesktopCodingPanel.vue'
import DesktopPlanEditor from '@/components/plan/DesktopPlanEditor.vue'
import DesktopAssistantPanel from '@/components/plan/DesktopAssistantPanel.vue'
import DesktopPlanSessionSidebar from '@/components/plan-code/DesktopPlanSessionSidebar.vue'
import DesktopModelSelectDialog from '@/components/plan-code/DesktopModelSelectDialog.vue'
import DesktopCreateSubPlanDialog from '@/components/plan-code/DesktopCreateSubPlanDialog.vue'
import DesktopGitChangesDialog from '@/components/plan-code/DesktopGitChangesDialog.vue'
import DesktopPlanCodeTest from '@/components/coding/DesktopPlanCodeTest.vue'
import { listPlanSessions, createPlanSession, renamePlanSession, deletePlanSession, readPlan, getModels, listCustomActions, getConfig, getBaseURL } from '@/api/index'
import { getItem, setItem } from '@/utils/storage'
import { ws } from '@/utils/websocket'
import { eventBus } from '@/utils/eventBus'

export default {
  name: 'DesktopCodingView',
  components: { DesktopCodingPanel, DesktopPlanEditor, DesktopAssistantPanel, DesktopPlanSessionSidebar, DesktopModelSelectDialog, DesktopCreateSubPlanDialog, DesktopGitChangesDialog, DesktopPlanCodeTest },
  inject: ['desktopState'],
  data() {
    return {
      currentModel: getItem('model:current', 'DeepSeek V3'),
      planSessions: [],
      currentPlanSession: null,
      planContent: '',
      planFilePath: '',
      displayCount: 10,
      pageSize: 10,
      assistantWidth: getItem('coding:assistantWidth', 500),
      modelSelectVisible: false,
      modelSelectTarget: 'code',
      subPlanDialogVisible: false,
      gitChangesDialogVisible: false,
      testDialogVisible: false,
      customActions: [],
      previewImage: null,
      currentMode: 'code',
      _renameUnsub: null,
      _unsubFileChanged: null,
      _unsubSwitchMode: null,
      _unsubReqContext: null,
      _unsubSaveUrl: null,
    }
  },
  computed: {
    runningSessionIds() {
      return this.desktopState ? this.desktopState.runningSessionIds : []
    },
    planFolderName() {
      return this.currentPlanSession ? this.currentPlanSession.folderName : ''
    },
  },
  watch: {
    currentMode(val) {
      if (val === 'plan') this.$nextTick(() => this.loadPlanContent())
    },
    currentModel(val) {
      setItem('model:current', val)
      const cp = this.$refs.codingPanel
      const ap = this.$refs.assistantPanel
      if (cp) cp.panel.modelName = val
      if (ap) {
        ap.designPanel.modelName = val
        ap.discussPanel.modelName = val
      }
    },
    runningSessionIds() {
      this.updateTitle()
    },
  },
  methods: {
    async loadPlanSessions() {
      try {
        const r = await listPlanSessions()
        this.planSessions = r.data || []
      } catch (e) {
        console.error('加载计划会话失败:', e)
      }
    },
    async createPlanSession() {
      try {
        await createPlanSession('新计划会话')
        await this.loadPlanSessions()
        const s = this.planSessions[0]
        if (s) await this.selectPlanSession(s)
      } catch (e) {
        console.error('创建失败:', e)
      }
    },
    async selectPlanSession(session) {
      if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) return
      this.currentPlanSession = session
      setItem('planSession:current', session)
      this.planFilePath = session.meta.planFilePath || ''
      const state = this.loadState(session.folderName)
      if (state && state.currentMode) {
        this.currentMode = state.currentMode
      } else {
        this.currentMode = 'code'
      }
      this.saveChatMode(session.folderName)
      eventBus.emit('coding:modeChanged', this.currentMode)
      if (this.currentMode === 'plan') {
        await this.loadPlanContent()
      }
      this.$nextTick(() => {
        if (this.$refs.planEditor && this.currentMode === 'plan') {
          this.$refs.planEditor.refresh()
        }
      })
      this.$nextTick(() => this.restoreCodeScrollTop())
    },
    onSidebarRename(session, newName) {
      this.renamePlanSession(session, newName)
    },
    onSidebarDelete(session) {
      this.deletePlanSession(session)
    },
    async loadPlanContent() {
      if (!this.planFolderName) return
      try {
        const r = await readPlan(this.planFolderName)
        this.planContent = (r.data && r.data.content) || ''
      } catch (e) {
        this.planContent = ''
      }
    },
    exportPlan() {
      if (!this.planFilePath) return
      const fileName = this.planFilePath.split('/').pop() || '方案.md'
      const url = `${getBaseURL()}/api/file/download_file?path=${encodeURIComponent(this.planFilePath)}`
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('下载失败')
          return res.blob()
        })
        .then(blob => {
          const downloadUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(downloadUrl)
        })
        .catch(e => alert('导出失败: ' + e.message))
    },
    async createSubPlan() {
      this.subPlanDialogVisible = true
    },
    async onSubPlanConfirm() {
      this.subPlanDialogVisible = false
      try {
        this.saveState()
        await createPlanSession('新计划会话', this.planFilePath)
        await this.loadPlanSessions()
        const s = this.planSessions[0]
        if (s) {
          const key = this.getStoreKey(s.folderName)
          localStorage.setItem(key, JSON.stringify({ currentMode: 'plan' }))
          await this.selectPlanSession(s)
        }
      } catch (e) {
        console.error('创建子方案失败:', e)
      }
    },
    async renamePlanSession(session, newName) {
      try {
        await renamePlanSession(session.folderName, newName)
        await this.loadPlanSessions()
        if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) {
          const u = this.planSessions.find(s => s.folderName === session.folderName)
          if (u) { this.currentPlanSession = u; this.planFilePath = u.meta.planFilePath || '' }
        }
      } catch (e) { console.error('重命名失败:', e) }
    },
    async deletePlanSession(session) {
      try {
        await deletePlanSession(session.folderName)
        if (this.currentPlanSession && this.currentPlanSession.folderName === session.folderName) {
          this.currentPlanSession = null
          this.planFilePath = ''
        }
        await this.loadPlanSessions()
      } catch (e) { console.error('删除失败:', e) }
    },
    handleOpenModelSelect(target) {
      this.modelSelectTarget = target
      this.modelSelectVisible = true
    },
    handleOpenTest() {
      this.testDialogVisible = true
    },
    onModelSelected(model) {
      const name = model.name.split('/').length > 2 ? model.name.split('/').slice(1).join('/') : model.name
      this.currentModel = name
      this.modelSelectVisible = false
    },
    async loadCustomActions() {
      try {
        const r = await listCustomActions('code')
        this.customActions = r.data || []
      } catch (e) {
        console.error('加载自定义动作失败:', e)
      }
    },
    async loadDefaultModel() {
      const stored = getItem('model:current', null)
      if (stored && stored !== 'DeepSeek V3') return
      try {
        const r = await getConfig('defaultModel')
        if (r.data?.value) {
          this.currentModel = r.data.value
        }
      } catch (e) {}
    },
    executeCustomAction(action) {
      const cp = this.$refs.codingPanel
      if (!cp) return
      cp.inputText = action.prompt
      cp.$nextTick(() => {
        const inputEl = cp.$el.querySelector('.code-textarea')
        if (inputEl) inputEl.focus()
        if (action.auto_send) cp.sendMessage()
      })
    },
    fillDevPlan() {
      this.currentMode = 'code'
      this.saveState()
      eventBus.emit('coding:modeChanged', 'code')
      this.$nextTick(() => {
        const cp = this.$refs.codingPanel
        if (cp && this.planFilePath) {
          cp.inputText = `根据 ${this.planFilePath} 方案开发相应功能，先不要修改方案文档。`
        } else if (cp) {
          cp.inputText = '根据方案开发相应功能，先不要修改方案文档。'
        }
      })
    },
    saveCodeScrollTop() {
      const cp = this.$refs.codingPanel
      if (cp) cp.saveCodeScrollTop()
    },
    restoreCodeScrollTop() {
      const cp = this.$refs.codingPanel
      if (cp) cp.restoreCodeScrollTop()
    },
    getStoreKey(folderName) {
      return `txcode:plan-code:${folderName}:state`
    },
    loadState(folderName) {
      if (!folderName) return null
      const raw = localStorage.getItem(this.getStoreKey(folderName))
      return raw ? JSON.parse(raw) : null
    },
    saveState() {
      if (!this.planFolderName) return
      const key = this.getStoreKey(this.planFolderName)
      const existing = this.loadState(this.planFolderName) || {}
      existing.currentMode = this.currentMode
      localStorage.setItem(key, JSON.stringify(existing))
    },
    saveChatMode(folderName) {
      if (!folderName) return
      localStorage.setItem(`txcode:code-view:${folderName}:chatMode`, this.currentMode)
    },
    loadChatMode(folderName) {
      return localStorage.getItem(`txcode:code-view:${folderName}:chatMode`) || null
    },
    onSwitchMode(mode) {
      if (this.currentMode === mode) return
      this.currentMode = mode
      this.saveState()
      this.saveChatMode(this.planFolderName)
      eventBus.emit('coding:modeChanged', mode)
      if (mode === 'plan') this.$nextTick(() => this.loadPlanContent())
    },
    updateTitle() {
      if (!this.runningSessionIds || this.runningSessionIds.length === 0) {
        document.title = 'TXCode'
        return
      }
      const myIds = []
      const s = this.currentPlanSession
      if (s) {
        const meta = s.meta || {}
        if (meta.codeSessionId) myIds.push(meta.codeSessionId)
        if (meta.designSessionId) myIds.push(meta.designSessionId)
        if (meta.testSessionId) myIds.push(meta.testSessionId)
        const discuss = meta.discussSessions || []
        for (const d of discuss) {
          if (d.sessionId) myIds.push(d.sessionId)
        }
      }
      const running = myIds.some(id => this.runningSessionIds.includes(id))
      document.title = running ? '⏳ TXCode' : 'TXCode'
    },
    openImagePreview(mf) {
      this.previewImage = mf
    },
    closeImagePreview() {
      this.previewImage = null
    },
    onResizeStart(e) {
      const startX = e.clientX
      const startW = this.assistantWidth
      const move = (ev) => {
        this.assistantWidth = Math.max(260, Math.min(600, startW + (startX - ev.clientX)))
      }
      const up = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setItem('coding:assistantWidth', this.assistantWidth)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
  },
  mounted() {
    this.loadPlanSessions()
    this.loadCustomActions()
    this.loadDefaultModel()
    this.updateTitle()
    this._renameUnsub = ws.on('rename', (msg) => {
      const data = msg.data || msg
      if (!data.folderName || !data.sessionName) return
      const session = this.planSessions.find(s => s.folderName === data.folderName)
      if (session) {
        this.renamePlanSession(session, data.sessionName)
      }
    })
    this._unsubFileChanged = eventBus.on('file:changed', (data) => {
      if (!this.planFilePath || !data.filePath) return
      const normPlan = this.planFilePath.replace(/\\/g, '/')
      const normFile = data.filePath.replace(/\\/g, '/')
      if (normFile === normPlan || normFile.includes('.txcode/plan-code/')) {
        this.loadPlanContent()
      }
    })
    this._unsubSwitchMode = eventBus.on('coding:switchMode', (mode) => {
      this.onSwitchMode(mode)
    })

    this._unsubReqContext = window.electronAPI?.onRequestTestContext(() => {
      const meta = this.currentPlanSession?.meta || {}
      window.electronAPI.sendTestContext({
        planFolderName: this.planFolderName,
        planFilePath: this.planFilePath,
        testUrl: meta.testUrl || '',
        modelName: this.currentModel,
        sessionId: meta.testSessionId || '',
        projectPath: this.desktopState.currentProject?.path || '',
      })
    })

    this._unsubSaveUrl = window.electronAPI?.onSaveTestUrl(async (testUrl) => {
      if (!this.currentPlanSession) return
      const { saveMeta } = await import('@/api/index')
      const meta = { ...this.currentPlanSession.meta, testUrl }
      await saveMeta(this.planFolderName, meta)
      this.currentPlanSession.meta = meta
    })
  },
  activated() {
    if (this.currentPlanSession && this.currentMode === 'code') {
      const cp = this.$refs.codingPanel
      if (cp && cp.panel.sessionId) {
        cp.subscribePanel(cp.panel.sessionId)
      }
    }
    this.restoreCodeScrollTop()
  },
  deactivated() {
    this.saveCodeScrollTop()
    this.saveState()
    const cp = this.$refs.codingPanel
    if (cp) cp.unsubscribePanel()
    const ap = this.$refs.assistantPanel
    if (ap) {
      ap.unsubscribeDesign()
      ap.unsubscribeDiscuss()
    }
  },
  beforeDestroy() {
    if (this._renameUnsub) { this._renameUnsub(); this._renameUnsub = null }
    if (this._unsubFileChanged) { this._unsubFileChanged(); this._unsubFileChanged = null }
    if (this._unsubSwitchMode) { this._unsubSwitchMode(); this._unsubSwitchMode = null }
    if (this._unsubReqContext) { this._unsubReqContext(); this._unsubReqContext = null }
    if (this._unsubSaveUrl) { this._unsubSaveUrl(); this._unsubSaveUrl = null }
  },
}
</script>

<style scoped>
.coding-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-panels {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 14px;
  gap: 0;
}
.content-panels.plan-gap {
  gap: 0px;
}

.resize-handle {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  border-radius: 2px;
}
.resize-handle:hover { background: var(--accent); opacity: 0.5; }

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-direction: column;
  gap: 12px;
}
.empty-icon { font-size: 48px; opacity: 0.3; }
.sidebar-new-btn {
  font-size: 12px;
  padding: 5px 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}
.sidebar-new-btn:hover { background: #4752c4; }

.image-lightbox {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
  z-index: 10000;
}
.lightbox-close {
  position: absolute; top: 20px; right: 30px; font-size: 30px; color: #fff; cursor: pointer;
}
.lightbox-image {
  max-width: 90%; max-height: 90%; border-radius: 8px;
}
</style>
