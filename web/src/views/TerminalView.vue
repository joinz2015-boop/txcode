<template>
  <div class="terminal-view">
    <TerminalSidebar
      v-if="sidebarVisible"
      :sessions="sessions"
      :current-session-id="currentSession?.id"
      @create="createSession"
      @select="selectSession"
      @delete="deleteSession"
    />

    <div class="terminal-container" :class="'layout-' + layoutMode">
      <div
        v-for="(panel, index) in activeTerminals"
        :key="index"
        class="terminal-panel"
        :class="{ 'panel-active': focusedPanelIndex === index }"
        @click="focusedPanelIndex = index"
      >
        <div class="panel-header">
          <span class="title">终端 {{ panel.sessionId ? panel.sessionId.slice(0, 8) : '' }}</span>
          <span class="platform-badge">{{ platform }}</span>
        </div>
        <TerminalPanel
          :ref="'terminalPanel_' + index"
          :session-id="panel.sessionId"
          :ws-connected="panel.wsConnected"
          @ws-connected="panel.wsConnected = true"
          @ws-disconnected="panel.wsConnected = false"
        />
      </div>
    </div>

    <div class="layout-switcher">
      <el-button-group>
        <el-button :type="layoutMode === 1 ? 'primary' : ''" @click="setLayout(1)">1</el-button>
        <el-button :type="layoutMode === 2 ? 'primary' : ''" @click="setLayout(2)">2</el-button>
        <el-button :type="layoutMode === 4 ? 'primary' : ''" @click="setLayout(4)">4</el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script>
import { api } from '../api'
import TerminalSidebar from '../components/TerminalSidebar.vue'
import TerminalPanel from '../components/TerminalPanel.vue'

export default {
  name: 'TerminalView',
  components: { TerminalSidebar, TerminalPanel },

  props: {
    sidebarVisible: { type: Boolean, default: true }
  },

  data() {
    return {
      layoutMode: 1,
      focusedPanelIndex: 0,
      sessions: [],
      currentSession: null,
      activeTerminals: [],
      platform: this.detectPlatform()
    }
  },

  watch: {
    '$route.params.id': {
      immediate: true,
      handler(id) {
        if (id) {
          const session = this.sessions.find(s => s.id === id)
          if (session) {
            this.currentSession = session
            this.bindSessionToPanel(session)
          }
        }
      }
    }
  },

  created() {
    this.loadSessions()
  },

  beforeDestroy() {
    this.activeTerminals.forEach(panel => {
      if (panel.sessionId) {
        api.terminalWsDisconnect(panel.sessionId)
      }
    })
  },

  methods: {
    detectPlatform() {
      const agent = navigator.userAgent.toLowerCase()
      if (agent.includes('win')) return 'Windows'
      if (agent.includes('mac')) return 'macOS'
      if (agent.includes('linux')) return 'Linux'
      return 'Unknown'
    },

    setLayout(mode) {
      this.layoutMode = mode
      this.updateActiveTerminals()
    },

    updateActiveTerminals() {
      const count = this.layoutMode
      const newActive = []
      for (let i = 0; i < count; i++) {
        newActive.push(this.activeTerminals[i] || {
          sessionId: null,
          wsConnected: false
        })
      }
      this.activeTerminals = newActive
    },

    bindSessionToPanel(session, panelIndex = null) {
      const idx = panelIndex !== null ? panelIndex : this.focusedPanelIndex
      if (idx >= 0 && idx < this.activeTerminals.length) {
        const panel = this.activeTerminals[idx]
        panel.sessionId = session.id
        panel.wsConnected = false
        this.initTerminalWs(panel)
      }
    },

    initTerminalWs(panel) {
      if (!panel.sessionId || panel.wsConnected) return
      
      api.terminalWsConnect(
        panel.sessionId,
        (msg) => this.handleTerminalMessage(panel, msg),
        () => { panel.wsConnected = true; this.$emit('ws-connected') },
        () => {
          panel.wsConnected = false
          this.$emit('ws-disconnected')
        },
        (err) => { panel.wsConnected = false; console.error(err) }
      )
    },

    handleTerminalMessage(panel, msg) {
      const terminalRef = this.$refs['terminalPanel_' + this.activeTerminals.indexOf(panel)][0]
      if (terminalRef && terminalRef.handleMessage) {
        terminalRef.handleMessage(msg)
      }
    },

    async loadSessions() {
      try {
        const res = await api.getTerminalSessions()
        this.sessions = res.data || []
        this.updateActiveTerminals()
      } catch (e) {
        console.error('加载终端会话失败:', e)
      }
    },

    async createSession() {
      try {
        const res = await api.createTerminalSession()
        const newSession = res.data
        this.sessions.unshift(newSession)
        this.currentSession = newSession
        
        if (this.$route.params.id !== newSession.id) {
          this.$router.push({ name: 'terminal-session', params: { id: newSession.id } }).catch(() => {})
        }
        
        this.bindSessionToPanel(newSession)
      } catch (e) {
        this.$message.error('创建终端会话失败: ' + e.message)
      }
    },

    selectSession(session) {
      this.currentSession = session
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'terminal-session', params: { id: session.id } }).catch(() => {})
      }
      this.bindSessionToPanel(session)
    },

    async deleteSession(session) {
      try {
        await api.deleteTerminalSession(session.id)
        const idx = this.sessions.findIndex(s => s.id === session.id)
        if (idx > -1) this.sessions.splice(idx, 1)
        
        if (this.currentSession?.id === session.id) {
          this.currentSession = this.sessions.length > 0 ? this.sessions[0] : null
          if (this.currentSession) {
            this.bindSessionToPanel(this.currentSession)
          }
        }
        
        this.$message.success('删除成功')
      } catch (e) {
        this.$message.error('删除失败: ' + e.message)
      }
    }
  }
}
</script>

<style scoped>
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #52525b; }

.terminal-view {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #0a0a09;
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace;
}

.terminal-container {
  flex: 1;
  display: grid;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.terminal-container.layout-1 { grid-template-columns: 1fr; }
.terminal-container.layout-2 { grid-template-columns: 1fr 1fr; }
.terminal-container.layout-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

.terminal-panel {
  display: flex;
  flex-direction: column;
  background-color: #0a0a09;
  border: 1px solid #1e1e1e;
  overflow: hidden;
  min-height: 0;
  cursor: pointer;
  transition: border-color 0.2s;
}

.terminal-panel:hover { border-color: #3b82f6; }
.terminal-panel.panel-active { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #121212;
  padding: 12px 16px;
  border-bottom: 1px solid #27272a;
  font-weight: bold;
  flex-shrink: 0;
}

.panel-header .title { color: #f4f4f5; font-size: 13px; }
.platform-badge {
  font-size: 11px;
  color: #84848a;
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 4px;
}

.layout-switcher { position: fixed; right: 20px; bottom: 20px; z-index: 100; }
</style>
