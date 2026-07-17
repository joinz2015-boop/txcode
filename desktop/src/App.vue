<template>
  <div class="app-root">
    <DesktopTitleBar
      :currentView="currentView"
      :currentProject="currentProject"
      :projects="projects"
      @selectProject="handleSelectProject"
      @deleteProject="handleDeleteProject"
      @openProject="handleOpenProject"
    />
    <div class="main-body">
      <DesktopSideBar
        ref="sidebar"
        v-if="useSidebar"
        :currentView="currentView"
        :currentSession="currentPlanSession"
        :runningSessionIds="runningSessionIds"
        @navigate="handleNavigate"
        @selectSession="handleSelectSession"
      />
      <DesktopNavRail
        v-if="useNavRail"
        :currentView="currentView"
        @navigate="handleNavigate"
      />
      <div class="content-area">
        <DesktopModeSwitcher
          v-if="showModeSwitcher"
          :currentMode="currentMode"
          @switchMode="handleSwitchMode"
        />
        <DesktopCodingView
          ref="codingView"
          v-show="currentView === 'coding'"
          :currentAgent="currentAgent"
          :currentModel="currentModel"
          :currentSession="currentPlanSession"
          :runningSessionIds="runningSessionIds"
          @update:agent="handleUpdateAgent"
          @update:model="handleUpdateModel"
        />
        <DesktopDesignView
          ref="designView"
          v-show="currentView === 'design'"
          @openDesignFile="handleOpenDesignFile"
        />
        <DesktopPlanView
          ref="planView"
          v-show="currentView === 'plan'"
          :currentSession="currentPlanSession"
          :currentModel="currentModel"
          :runningSessionIds="runningSessionIds"
          @refreshSessions="handleRefreshSessions"
        />
        <DesktopSpecsView ref="specsView" v-show="currentView === 'specs'" />
        <DesktopSkillsView ref="skillsView" v-show="currentView === 'skills'" />
        <DesktopSettingsView ref="settingsView" v-show="currentView === 'settings'" />
      </div>
    </div>
    <DesktopStatusBar
      :currentProjectName="currentProject.name"
      :currentModel="currentModel"
      :nodeVersion="nodeVersion"
      :appVersion="appVersion"
    />

    <DesktopSelectProjectDialog
      v-if="projectDialogVisible"
      @close="projectDialogVisible = false"
      @success="handleProjectDialogSuccess"
    />

    <div class="overlay" v-if="deleteConfirmVisible" @click.self="deleteConfirmVisible = false">
      <div class="confirm-dialog">
        <div class="dialog-header">
          <span>删除确认</span>
          <button class="dialog-close" @click="deleteConfirmVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <p class="confirm-text">确定要删除项目「{{ deleteTarget?.name }}」的记录吗？</p>
          <p class="confirm-hint">仅删除数据库记录，不删除实际文件。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="deleteConfirmVisible = false">取消</button>
          <button class="btn-danger" @click="handleConfirmDelete" :disabled="deleteLoading">
            {{ deleteLoading ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopTitleBar from '@/components/DesktopTitleBar.vue'
import DesktopSideBar from '@/components/DesktopSideBar.vue'
import DesktopNavRail from '@/components/DesktopNavRail.vue'
import DesktopStatusBar from '@/components/DesktopStatusBar.vue'
import DesktopModeSwitcher from '@/components/DesktopModeSwitcher.vue'
import DesktopCodingView from '@/views/DesktopCodingView.vue'
import DesktopDesignView from '@/views/DesktopDesignView.vue'
import DesktopPlanView from '@/views/DesktopPlanView.vue'
import DesktopSpecsView from '@/views/DesktopSpecsView.vue'
import DesktopSkillsView from '@/views/DesktopSkillsView.vue'
import DesktopSettingsView from '@/views/DesktopSettingsView.vue'
import DesktopSelectProjectDialog from '@/components/config/DesktopSelectProjectDialog.vue'
import { getPort, getAppVersion, getNodeVersion } from '@/utils/ipc'
import { setBaseURL, getConfig, getProjects, getCurrentProject, setCurrentProject, deleteProject } from '@/api/index'
import { ws } from '@/utils/websocket'
import { getItem, setItem } from '@/utils/storage'

export default {
  name: 'App',
  components: {
    DesktopTitleBar,
    DesktopSideBar,
    DesktopNavRail,
    DesktopStatusBar,
    DesktopModeSwitcher,
    DesktopCodingView,
    DesktopDesignView,
    DesktopPlanView,
    DesktopSpecsView,
    DesktopSkillsView,
    DesktopSettingsView,
    DesktopSelectProjectDialog
  },
  data() {
    return {
      currentView: getItem('app:currentView', 'coding'),
      currentProject: getItem('project:current', { name: 'txcode', path: '', color: '#4f6ef7' }),
      projects: getItem('project:list', [{ name: 'txcode', path: '', color: '#4f6ef7' }]),
      currentMode: getItem('mode:current', 'code'),
      currentPlanSession: getItem('planSession:current', null),
      currentAgent: getItem('agent:current', 'Code Agent'),
      currentModel: getItem('model:current', 'DeepSeek V3'),
      nodeVersion: '',
      appVersion: '1.0.55',
      runningSessionIds: [],
      unsubRunning: null,
      _renameUnsub: null,
      projectDialogVisible: false,
      deleteConfirmVisible: false,
      deleteTarget: null,
      deleteLoading: false
    }
  },
  computed: {
    useSidebar() {
      return ['coding', 'plan', 'specs', 'skills', 'settings'].includes(this.currentView)
    },
    useNavRail() {
      return this.currentView === 'design'
    },
    showModeSwitcher() {
      return (this.currentView === 'coding' || this.currentView === 'plan') && this.currentPlanSession
    }
  },
  methods: {
    handleNavigate(view, data) {
      if (view !== 'coding' && this.$refs.codingView && this.$refs.codingView.$refs.codingPanel) {
        this.$refs.codingView.$refs.codingPanel.saveCodeScrollTop()
      }
      this.currentView = view
      setItem('app:currentView', view)
      this.$nextTick(() => {
        const refMap = {
          coding: 'codingView',
          design: 'designView',
          plan: 'planView',
          specs: 'specsView',
          skills: 'skillsView',
          settings: 'settingsView'
        }
        const refName = refMap[view]
        if (refName && this.$refs[refName]) {
          this.$refs[refName].open(data)
        }
      })
    },
    async handleSelectProject(project) {
      try {
        await setCurrentProject(project.id)
        this.currentProject = project
        setItem('project:current', project)
        location.reload()
      } catch (e) {
        console.error('切换项目失败:', e)
      }
    },
    handleDeleteProject(project) {
      this.deleteTarget = project
      this.deleteConfirmVisible = true
    },
    async handleConfirmDelete() {
      if (!this.deleteTarget) return
      this.deleteLoading = true
      try {
        await deleteProject(this.deleteTarget.id)
        if (this.currentProject?.id === this.deleteTarget.id) {
          this.currentProject = { name: 'txcode', path: '', color: '#4f6ef7' }
          setItem('project:current', this.currentProject)
        }
        await this.loadProjects()
        setItem('project:list', this.projects)
        this.deleteConfirmVisible = false
        this.deleteTarget = null
      } catch (e) {
        console.error('删除项目失败:', e)
      } finally {
        this.deleteLoading = false
      }
    },
    handleOpenProject() {
      this.projectDialogVisible = true
    },
    async handleProjectDialogSuccess() {
      this.projectDialogVisible = false
      await this.loadProjects()
      setItem('project:list', this.projects)
      location.reload()
    },
    async loadProjects() {
      try {
        const res = await getProjects()
        this.projects = (res.data || []).map(p => ({ ...p, color: '#4f6ef7' }))
        if (this.projects.length > 0) {
          const cur = await getCurrentProject()
          if (cur.data) {
            this.currentProject = { ...cur.data, color: '#4f6ef7' }
          } else {
            this.currentProject = this.projects[0]
          }
        }
        setItem('project:current', this.currentProject)
      } catch (e) {
        console.error('加载项目失败:', e)
      }
    },
    handleSelectSession(session) {
      if (this.$refs.codingView && this.$refs.codingView.$refs.codingPanel) {
        this.$refs.codingView.$refs.codingPanel.saveCodeScrollTop()
      }
      this.currentPlanSession = session
      if (!session) {
        this.currentMode = 'code'
        setItem('mode:current', 'code')
        return
      }
      this.currentMode = 'code'
      setItem('mode:current', 'code')
      setItem('planSession:current', session)
      this.currentView = 'coding'
      setItem('app:currentView', 'coding')
    },
    handleSwitchMode(mode) {
      if (this.currentMode !== mode && this.currentMode === 'code' && this.$refs.codingView && this.$refs.codingView.$refs.codingPanel) {
        this.$refs.codingView.$refs.codingPanel.saveCodeScrollTop()
      }
      this.currentMode = mode
      setItem('mode:current', mode)
      if (mode === 'plan') {
        this.handleNavigate('plan')
      } else if (mode === 'code') {
        this.handleNavigate('coding')
      }
    },
    handleRefreshSessions() {
      if (this.$refs.sidebar) {
        this.$refs.sidebar.loadSessions()
      }
    },
    handleUpdateAgent(agent) {
      this.currentAgent = agent
      setItem('agent:current', agent)
    },
    handleUpdateModel(model) {
      this.currentModel = model
      setItem('model:current', model)
    },
    handleOpenDesignFile(data) {
      this.handleNavigate('design', data)
    }
  },
  async mounted() {
    try {
      const port = await getPort()
      setBaseURL(port)
      ws.init(port)
    } catch (e) {
      console.error('Init error:', e)
    }
    try {
      const nv = await getNodeVersion()
      this.nodeVersion = nv
    } catch (e) {}

    try {
      const r = await getConfig('defaultModel')
      if (r.data && r.data.value) {
        this.currentModel = r.data.value
        setItem('model:current', r.data.value)
      }
    } catch (e) {}

    try {
      await this.loadProjects()
      setItem('project:list', this.projects)
    } catch (e) {
      console.error('Init projects error:', e)
    }

    this.unsubRunning = ws.on('running_sessions', (msg) => {
      this.runningSessionIds = (msg.data && msg.data.runningSessionIds) || (msg.runningSessionIds) || []
    })

    this._renameUnsub = ws.on('rename', (msg) => {
      const data = msg.data || msg
      if (data.folderName && data.sessionName && this.currentPlanSession && this.currentPlanSession.folderName === data.folderName) {
        this.currentPlanSession = {
          ...this.currentPlanSession,
          meta: { ...this.currentPlanSession.meta, sessionName: data.sessionName }
        }
        setItem('planSession:current', this.currentPlanSession)
      }
    })
  },
  beforeDestroy() {
    if (this.unsubRunning) { this.unsubRunning(); this.unsubRunning = null }
    if (this._renameUnsub) { this._renameUnsub(); this._renameUnsub = null }
    ws.disconnect()
  }
}
</script>

<style>
html, body, #app { margin: 0; padding: 0; height: 100%; overflow: hidden; }
.app-root { display: flex; flex-direction: column; height: 100vh; width: 100vw; background: var(--bg-window); overflow: hidden; }
.main-body { display: flex; flex: 1; overflow: hidden; }
.content-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-chat); position: relative; }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.confirm-dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 380px; max-width: 90vw;
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
.dialog-body {
  padding: 20px 16px;
}
.confirm-text { font-size: 14px; color: var(--text-primary); margin: 0; }
.confirm-hint { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-danger {
  padding: 6px 14px; background: #ef4444; color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-danger:hover { background: #dc2626; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
