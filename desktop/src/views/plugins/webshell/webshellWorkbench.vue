<template>
  <div class="workbench">
    <div class="workbench-body">
      <div class="terminal-panel" ref="termPanel">
        <div class="terminal-header">
          <button class="btn-back" @click="$router.push('/views/plugins/webshellManage')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="header-title">WebShell - {{ hostName }}</span>
          <span v-if="processing" class="status processing">AI处理中</span>
        </div>
        <div class="terminal-wrap">
          <ShellTerminal ref="term" :onData="handleTermData" />
        </div>
      </div>
      <div class="resize-handle" @mousedown="startResize"></div>
      <div class="chat-panel-wrap" :style="{ width: chatWidth + 'px', flex: 'none' }">
        <AiChatPanel
          ref="chatPanel"
          :disabled="processing"
          :ws="shellWs"
          :sessionId="sessionId"
          :modelName="modelName"
          @send="handleChatSend"
          @stop="handleStop"
          @open-model-select="$emit('open-model-select')"
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
      chatWidth: 480,
      _lastOutputEndsWithNewline: true,
    }
  },
  computed: {
    modelName() {
      return this.desktopState?.currentModel || ''
    },
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
          const text = data || ''
          this.$refs.term?.write(text)
          this._lastOutputEndsWithNewline = text.endsWith('\n') || text.endsWith('\r\n')
          break

        case 'ai:input':
          this.$refs.term?.write('\x1b[33m' + (message || '') + '\x1b[0m')
          this._lastOutputEndsWithNewline = true
          break

        case 'ai:output':
          this.$refs.term?.write(data || '')
          break

        case 'ai:exec-done':
          this.$nextTick(() => {
            if (this.shellWs && this.connected) {
              this.shellWs.send(JSON.stringify({ type: 'terminal:input', data: '\r' }))
            }
          })
          break

        case 'step':
          this.processing = true
          this.$refs.chatPanel?.addStep(msg.data)
          this.$refs.chatPanel?.updateUsage(msg.data?.usage)
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
          this.$refs.chatPanel?.updateUsage(msg.data?.usage)
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

    handleStop() {
      if (this.shellWs) {
        this.shellWs.send(JSON.stringify({ type: 'stop' }))
      }
    },

    handleDisconnect() {
      if (this.shellWs) {
        this.shellWs.send(JSON.stringify({ type: 'terminal:disconnect' }))
        this.shellWs.close()
      }
      this.connected = false
    },

    async reconnect() {
      try {
        const ws = await this.connectWebSocket()
        ws.send(JSON.stringify({
          type: 'terminal:connect',
          data: { hostId: this.hostId }
        }))
      } catch (e) {
        console.error('WebSocket重连失败:', e)
      }
    },

    startResize(e) {
      e.preventDefault()
      const startX = e.clientX
      const startW = this.chatWidth
      const onMove = (ev) => {
        this.chatWidth = Math.max(260, Math.min(600, startW + (startX - ev.clientX)))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
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
  activated() {
    this.$refs.term?.reset()
    const newHostId = this.$route.query.hostId || ''
    if (newHostId && newHostId !== this.hostId) {
      this.hostId = newHostId
      if (this.shellWs) {
        this.shellWs.close()
        this.shellWs = null
        this.connected = false
      }
      this.reconnect()
    } else if (!this.connected && this.hostId) {
      this.reconnect()
    }
  },
  deactivated() {
    this._lastOutputEndsWithNewline = true
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
  overflow: hidden;
}
.workbench-body {
  height: 100%;
  display: flex;
  overflow: hidden;
}
.terminal-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}
.terminal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  flex-shrink: 0;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
}
.btn-back {
  width: 26px;
  height: 26px;
  border: 1px solid #555;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
}
.btn-back:hover { background: #3c3c3c; }
.header-title {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}
.status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}
.status.processing { background: #1e3a5f; color: #60a5fa; }
.terminal-wrap {
  flex: 1;
  min-height: 0;
}
.resize-handle {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  border-radius: 2px;
  background: #3c3c3c;
}
.resize-handle:hover { background: var(--accent); opacity: 0.5; }
.chat-panel-wrap {
  height: 100%;
  overflow: hidden;
}
</style>
