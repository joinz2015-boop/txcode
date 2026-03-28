<template>
  <div class="terminal-view">
    <div class="terminal-container">
      <div class="terminal-panel">
        <div class="panel-tabs" v-if="activeTerminals[0].tabs.length > 0">
          <div
            v-for="(tab, tabIndex) in activeTerminals[0].tabs"
            :key="tab.sessionId"
            class="panel-tab"
            :class="{ 'tab-active': activeTerminals[0].activeTabIndex === tabIndex }"
            @click.stop="switchPanelTab(tabIndex)"
          >
            <span class="tab-title">{{ tab.sessionId ? tab.sessionId.slice(0, 8) : '新会话' }}</span>
            <span class="tab-close" @click.stop="closePanelTab(tabIndex)">×</span>
          </div>
          <span class="tab-add" @click.stop="createTabInPanel">+</span>
        </div>
        <div class="panel-header">
          <span class="title">终端 {{ activeTerminals[0].tabs[activeTerminals[0].activeTabIndex]?.sessionId ? activeTerminals[0].tabs[activeTerminals[0].activeTabIndex].sessionId.slice(0, 8) : '' }}</span>
          <span class="platform-badge">{{ platform }}</span>
        </div>
        <div class="terminal-content">
          <TerminalPanel
            v-for="(tab, tabIndex) in activeTerminals[0].tabs"
            v-show="activeTerminals[0].activeTabIndex === tabIndex"
            :key="tab.sessionId"
            :session-id="tab.sessionId"
            :active="activeTerminals[0].activeTabIndex === tabIndex"
            :ref="'terminal-' + tab.sessionId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'
import TerminalPanel from '../components/TerminalPanel.vue'

export default {
  name: 'TerminalView',
  components: { TerminalPanel },

  data() {
    return {
      activeTerminals: [{ tabs: [], activeTabIndex: 0 }],
      platform: this.detectPlatform()
    }
  },

  watch: {
    '$route.params.id': {
      immediate: true,
      handler(id) {
        if (id) {
          this.bindSessionToPanel(id)
        }
      }
    }
  },

  created() {
    this.loadOrCreateSession()
  },

  activated() {
  },

  methods: {
    detectPlatform() {
      const agent = navigator.userAgent.toLowerCase()
      if (agent.includes('win')) return 'Windows'
      if (agent.includes('mac')) return 'macOS'
      if (agent.includes('linux')) return 'Linux'
      return 'Unknown'
    },

    createTab(sessionId) {
      return { sessionId, wsConnected: false }
    },

    switchPanelTab(tabIndex) {
      this.activeTerminals[0].activeTabIndex = tabIndex
    },

    closePanelTab(tabIndex) {
      const panel = this.activeTerminals[0]
      const tab = panel.tabs[tabIndex]
      if (tab?.sessionId) {
        api.terminalWsDisconnect(tab.sessionId)
      }
      panel.tabs.splice(tabIndex, 1)
      if (panel.activeTabIndex >= panel.tabs.length) {
        panel.activeTabIndex = Math.max(0, panel.tabs.length - 1)
      }
    },

    bindSessionToPanel(sessionId) {
      const panel = this.activeTerminals[0]
      const existingTab = panel.tabs.find(t => t.sessionId === sessionId)
      if (existingTab) {
        panel.activeTabIndex = panel.tabs.indexOf(existingTab)
      } else {
        const newTab = this.createTab(sessionId)
        panel.tabs.push(newTab)
        panel.activeTabIndex = panel.tabs.length - 1
      }
    },

    async loadOrCreateSession() {
      try {
        const res = await api.getTerminalSessions()
        const sessions = res.data || []
        if (sessions.length > 0) {
          const session = sessions[0]
          if (this.$route.params.id !== session.id) {
            this.$router.push({ name: 'terminal-session', params: { id: session.id } }).catch(() => {})
          }
          this.bindSessionToPanel(session.id)
        } else {
          await this.createTabInPanel()
        }
      } catch (e) {
        console.error('加载终端会话失败:', e)
        await this.createTabInPanel()
      }
    },

    async createTabInPanel() {
      try {
        const res = await api.createTerminalSession()
        const newSession = res.data
        const panel = this.activeTerminals[0]
        const newTab = this.createTab(newSession.id)
        panel.tabs.push(newTab)
        panel.activeTabIndex = panel.tabs.length - 1
        if (this.$route.params.id !== newSession.id) {
          this.$router.push({ name: 'terminal-session', params: { id: newSession.id } }).catch(() => {})
        }
      } catch (e) {
        this.$message.error('创建终端会话失败: ' + e.message)
      }
    }
  }
}
</script>

<style scoped>
.terminal-view {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #0a0a09;
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace;
}

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}

.terminal-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: #0a0a09;
  border: 1px solid #1e1e1e;
  overflow: hidden;
  min-height: 0;
}

.terminal-panel:hover { border-color: #3b82f6; }

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
.panel-tabs { display: flex; background: #1e1e1e; border-bottom: 1px solid #27272a; overflow-x: auto; }
.panel-tab { display: flex; align-items: center; gap: 6px; padding: 8px 12px; cursor: pointer; border-right: 1px solid #27272a; font-size: 12px; color: #a1a1aa; }
.panel-tab:hover { background: #27272a; }
.panel-tab.tab-active { background: #0a0a09; color: #fff; border-bottom: 2px solid #3b82f6; }
.tab-close { opacity: 0.5; }
.tab-close:hover { opacity: 1; color: #ef4444; }
.tab-add { display: flex; align-items: center; padding: 8px 12px; cursor: pointer; color: #a1a1aa; font-size: 14px; }
.tab-add:hover { background: #27272a; color: #fff; }
.terminal-content { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.platform-badge {
  font-size: 11px;
  color: #84848a;
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 4px;
}


</style>
