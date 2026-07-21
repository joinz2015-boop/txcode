<template>
  <div class="workbench">
    <div class="workbench-header">
      <button class="btn-back" @click="$router.push('/views/plugins/webshellManage')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="header-title">WebShell - {{ hostName }}</span>
      <span v-if="connected" class="status connected">已连接</span>
      <span v-else class="status disconnected">未连接</span>
      <span v-if="processing" class="status processing">AI处理中</span>
      <button v-if="connected" class="btn-disconnect" @click="handleDisconnect">断开</button>
    </div>
    <div class="workbench-body">
      <div class="terminal-panel" ref="termPanel">
        <ShellTerminal ref="term" :onData="handleTermData" />
      </div>
      <div class="resize-handle" @mousedown="startResize"></div>
      <div class="chat-panel-wrap">
        <AiChatPanel
          ref="chatPanel"
          :disabled="processing"
          :ws="shellWs"
          :sessionId="sessionId"
          @send="handleChatSend"
        />
      </div>
    </div>
  </div>
</template>

<script>
import ShellTerminal from '@/components/plugins/webshell/ShellTerminal.vue'
import AiChatPanel from '@/components/plugins/webshell/AiChatPanel.vue'
import { getPort } from '@/utils/ipc'

export default {
  name: 'webshellWorkbench',
  components: { ShellTerminal, AiChatPanel },
  inject: ['desktopState'],
  data() {
    return {
      hostId: '',
      hostName: '',
      sessionId: '',
      connected: false,
      processing: false,
      shellWs: null,
      termRatio: 0.6,
    }
  },
  methods: {
    handleTermData(data) {
      if (this.shellWs && this.connected) {
        this.shellWs.send(JSON.stringify({ type: 'terminal:input', data }))
      }
    },

    async connectWebSocket() {
      const port = await getPort()
      return new Promise((resolve, reject) => {
        const wsUrl = `ws://localhost:${port}/ws/shell`
        const ws = new WebSocket(wsUrl)
        ws.onopen = () => {
          this.shellWs = ws
          resolve(ws)
        }
        ws.onerror = (err) => reject(err)
        ws.onmessage = (e) => this.handleWsMessage(JSON.parse(e.data))
        ws.onclose = () => {
          this.connected = false
          this.shellWs = null
        }
      })
    },

    handleWsMessage(msg) {
      const { type, data, sessionId: _sid, message } = msg

      switch (type) {
        case 'terminal:ready':
          this.sessionId = _sid || msg.sessionId
          this.connected = true
          this.$nextTick(() => this.$refs.term?.focus())
          break

        case 'terminal:output':
          this.$refs.term?.write(data || '')
          break

        case 'shell:display':
          this.$refs.term?.writeln('\r\n\x1b[33m' + (message || '') + '\x1b[0m')
          break

        case 'step':
          this.processing = true
          if (msg.data?.toolCalls) {
            for (const tc of msg.data.toolCalls) {
              const fnName = tc.function?.name || tc.name
              const args = tc.function?.arguments || tc.arguments
              this.$refs.chatPanel?.addTool('工具: ' + fnName + ' ' + JSON.stringify(args))
            }
          }
          break

        case 'chat:response':
          if (msg.data?.answer) {
            this.$refs.chatPanel?.setStreaming(msg.data.answer)
          }
          break

        case 'done':
          this.processing = false
          if (msg.data?.response) {
            this.$refs.chatPanel?.finishStreaming(msg.data.response)
          }
          break

        case 'stopped':
          this.processing = false
          this.$refs.chatPanel?.setThinking(false)
          break

        case 'error':
          this.processing = false
          this.$refs.chatPanel?.addAssistant('[错误] ' + (msg.error || '未知错误'))
          break

        case 'pong':
          break
      }
    },

    handleChatSend(message) {
      if (this.shellWs && this.connected) {
        this.shellWs.send(JSON.stringify({
          type: 'chat:message',
          data: { message }
        }))
      }
    },

    handleDisconnect() {
      if (this.shellWs) {
        this.shellWs.send(JSON.stringify({ type: 'terminal:disconnect' }))
        this.shellWs.close()
      }
      this.connected = false
    },

    startResize(e) {
      e.preventDefault()
      const startX = e.clientX
      const startRatio = this.termRatio
      const panel = this.$refs.termPanel
      const totalWidth = panel?.parentElement?.offsetWidth || window.innerWidth

      const onMove = (ev) => {
        const dx = ev.clientX - startX
        const newRatio = Math.max(0.3, Math.min(0.8, startRatio + dx / totalWidth))
        this.termRatio = newRatio
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
  },
  async mounted() {
    this.hostId = this.$route.query.hostId || ''
    if (!this.hostId) {
      this.$router.push('/views/plugins/webshellManage')
      return
    }

    try {
      const ws = await this.connectWebSocket()
      ws.send(JSON.stringify({
        type: 'terminal:connect',
        data: { hostId: this.hostId }
      }))
    } catch (e) {
      console.error('WebSocket连接失败:', e)
    }
  },
  beforeDestroy() {
    if (this.shellWs) {
      this.shellWs.close()
      this.shellWs = null
    }
  },
  computed: {
    termWidth() {
      return (this.termRatio * 100) + '%'
    },
    chatWidth() {
      return ((1 - this.termRatio) * 100 - 0.5) + '%'
    },
  },
}
</script>

<style scoped>
.workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.workbench-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: #fff;
}
.btn-back {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.btn-back:hover { background: var(--bg-hover); }
.header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}
.status.connected { background: #ecfdf5; color: #065f46; }
.status.disconnected { background: #fef2f2; color: #991b1b; }
.status.processing { background: #eff6ff; color: #1e40af; }
.btn-disconnect {
  margin-left: auto;
  padding: 4px 10px;
  background: #fff;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.btn-disconnect:hover { background: #fef2f2; }
.workbench-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.terminal-panel {
  width: v-bind(termWidth);
  height: 100%;
  flex-shrink: 0;
}
.resize-handle {
  width: 5px;
  cursor: col-resize;
  background: var(--border);
  flex-shrink: 0;
  transition: background 0.15s;
}
.resize-handle:hover { background: var(--accent); }
.chat-panel-wrap {
  flex: 1;
  height: 100%;
  overflow: hidden;
}
</style>
