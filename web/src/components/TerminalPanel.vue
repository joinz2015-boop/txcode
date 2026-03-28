<template>
  <div class="terminal-panel" ref="terminalPanel">
    <div ref="terminalContainer" class="terminal-output"></div>
    <div class="status-bar">
      <span :class="wsConnected ? 'status-connected' : 'status-disconnected'">
        {{ wsConnected ? '● 已连接' : '○ 未连接' }}
      </span>
      <span class="separator">|</span>
      <span>会话: {{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
      <span class="separator">|</span>
      <span class="status-action" @click="clearScreen">清屏</span>
    </div>
  </div>
</template>

<script>
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { api } from '../api'

export default {
  name: 'TerminalPanel',
  
  props: {
    sessionId: { type: String, default: null },
    active: { type: Boolean, default: false }
  },

  data() {
    return {
      wsConnected: false,
      term: null,
      fitAddon: null,
      mounted: false
    }
  },

  watch: {
    active: {
      immediate: true,
      handler(isActive) {
        if (isActive && this.sessionId && !this.term) {
          this.$nextTick(() => {
            this.initTerminal()
          })
        } else if (!isActive && this.term) {
          this.disconnectWs(this.sessionId)
        } else if (isActive && this.term) {
          this.connectWs()
          this.$nextTick(() => {
            this.fit()
          })
        }
      }
    }
  },

  methods: {
    initTerminal() {
      if (this.term) {
        this.term.dispose()
      }

      this.term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
        theme: {
          background: '#0a0a09',
          foreground: '#d4d4d8',
          cursor: '#22c55e',
          cursorAccent: '#0a0a09',
          selectionBackground: 'rgba(59, 130, 246, 0.5)',
          black: '#0a0a09',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#d4d4d8',
          brightBlack: '#545459',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#f4f4f5'
        },
        scrollback: 10000
      })

      this.fitAddon = new FitAddon()
      this.term.loadAddon(this.fitAddon)

      this.term.open(this.$refs.terminalContainer)
      this.$nextTick(() => {
        this.fitAddon.fit()
      })

      this.term.onData((data) => {
        if (this.sessionId && this.wsConnected) {
          api.terminalWsSend(this.sessionId, 'input', data)
        }
      })

      this.term.onResize(({ cols, rows }) => {
        if (this.sessionId && this.wsConnected) {
          api.terminalWsSend(this.sessionId, 'resize', { cols, rows })
        }
      })

      window.addEventListener('resize', this.handleResize)
      
      this.connectWs()
    },

    handleResize() {
      if (this.fitAddon) {
        this.fitAddon.fit()
      }
    },

    connectWs() {
      if (!this.sessionId) return
      
      api.terminalWsConnect(
        this.sessionId,
        (msg) => this.handleMessage(msg),
        () => { 
          this.wsConnected = true 
          this.$emit('ws-connected', true)
        },
        () => { 
          this.wsConnected = false 
          this.$emit('ws-disconnected', false)
        },
        (err) => { 
          this.wsConnected = false
          console.error('WebSocket error:', err)
        }
      )
    },

    disconnectWs(sessionId) {
      api.terminalWsDisconnect(sessionId)
      this.wsConnected = false
    },

    handleMessage(msg) {
      if (!this.term) return

      const { type, data } = msg
      switch (type) {
        case 'output':
          this.term.write(data)
          break
        case 'exit':
          this.term.write(`\r\n[进程退出，退出码: ${data.code || 0}]\r\n`)
          break
        case 'error':
          this.term.write(`\r\n[错误] ${data.message}\r\n`)
          break
        case 'platform':
          break
      }
    },

    clearScreen() {
      if (this.term) {
        this.term.clear()
        this.term.reset()
      }
    },

    fit() {
      if (this.fitAddon) {
        this.fitAddon.fit()
      }
    }
  },

  mounted() {
    this.mounted = true
    if (this.active && this.sessionId) {
      this.initTerminal()
    }
  },

  activated() {
    if (this.sessionId && !this.wsConnected) {
      this.connectWs()
    }
  },

  deactivated() {
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.sessionId) {
      this.disconnectWs(this.sessionId)
    }
    if (this.term) {
      this.term.dispose()
    }
  }
}
</script>

<style scoped>
.terminal-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.terminal-output {
  flex: 1;
  padding: 8px;
  background: #0a0a09;
  overflow: hidden;
}

.terminal-output :deep(.xterm) {
  height: 100%;
}

.terminal-output :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.status-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 16px;
  font-size: 12px;
  color: #84848a;
  border-top: 1px solid #27272a;
  flex-shrink: 0;
}

.status-bar .separator { color: #3f3f46; }
.status-connected { color: #22c55e; }
.status-disconnected { color: #ef4444; }
.status-action { cursor: pointer; }
.status-action:hover { color: #60a5fa; }
</style>
