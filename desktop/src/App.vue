<template>
  <div class="app-root">
    <DesktopTitleBar
      :currentView="currentView"
      :currentProject="currentProject"
      :projects="projects"
      @selectProject="handleSelectProject"
    />
    <div class="main-body">
      <DesktopSideBar
        ref="sidebar"
        v-if="useSidebar"
        :currentView="currentView"
        :currentSession="currentPlanSession"
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
import { getPort, getAppVersion, getNodeVersion } from '@/utils/ipc'
import { setBaseURL, getConfig } from '@/api/index'
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
    DesktopSettingsView
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
      _renameUnsub: null
    }
  },
  computed: {
    useSidebar() {
      return ['coding', 'specs', 'skills', 'settings'].includes(this.currentView)
    },
    useNavRail() {
      return this.currentView === 'design'
    },
    showModeSwitcher() {
      return this.currentView === 'coding' && this.currentPlanSession
    }
  },
  methods: {
    handleNavigate(view, data) {
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
    handleSelectProject(project) {
      this.currentProject = project
      setItem('project:current', project)
    },
    handleSelectSession(session) {
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
</style>
