<template>
  <div class="terminal-panel">
    <div ref="terminalContainer" class="terminal-output"></div>
    <div class="terminal-input-block">
      <span class="prompt">{{ promptSymbol }}</span>
      <input
        ref="terminalInput"
        v-model="inputValue"
        type="text"
        class="terminal-input"
        :placeholder="inputPlaceholder"
        :disabled="!sessionId"
        @keydown.enter="sendCommand"
        @keydown.ctrl.c="sendInterrupt"
        @keydown.ctrl.l="clearScreen"
      />
    </div>
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
import { api } from '../api'

export default {
  name: 'TerminalPanel',
  
  props: {
    sessionId: { type: String, default: null },
    wsConnected: { type: Boolean, default: false }
  },

  data() {
    return {
      inputValue: '',
      outputBuffer: [],
      promptSymbol: '$',
      inputPlaceholder: '输入命令后按 Enter 执行...'
    }
  },

  watch: {
    sessionId: {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.inputPlaceholder = '输入命令后按 Enter 执行...'
        } else {
          this.inputPlaceholder = '选择或创建终端会话...'
        }
      }
    }
  },

  methods: {
    handleMessage(msg) {
      const { type, data } = msg
      switch (type) {
        case 'output':
          this.appendOutput(data)
          break
        case 'exit':
          this.appendOutput(`\n[进程退出，退出码: ${data.code || 0}]\n`)
          this.promptSymbol = '$'
          break
        case 'error':
          this.appendOutput(`[错误] ${data.message}\n`)
          this.promptSymbol = '$'
          break
        case 'platform':
          this.updatePrompt(data.platform)
          break
      }
    },

    updatePrompt(platform) {
      if (platform === 'windows') {
        this.promptSymbol = '>'
      } else {
        this.promptSymbol = '$'
      }
    },

    appendOutput(text) {
      this.outputBuffer.push(text)
      this.renderOutput()
    },

    renderOutput() {
      if (this.$refs.terminalContainer) {
        this.$refs.terminalContainer.innerHTML = this.outputBuffer.join('')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        this.$refs.terminalContainer.scrollTop = this.$refs.terminalContainer.scrollHeight
      }
    },

    clearScreen() {
      this.outputBuffer = []
      if (this.$refs.terminalContainer) {
        this.$refs.terminalContainer.innerHTML = ''
      }
    },

    sendCommand() {
      if (!this.inputValue.trim() || !this.sessionId) return
      
      const command = this.inputValue + '\n'
      this.appendOutput(this.promptSymbol + ' ' + this.inputValue + '\n')
      this.inputValue = ''
      
      if (api.terminalWsSend(this.sessionId, 'input', command)) {
        this.promptSymbol = '...'
      } else {
        this.appendOutput('[错误] WebSocket 未连接\n')
        this.promptSymbol = '$'
      }
    },

    sendInterrupt() {
      if (!this.sessionId) return
      api.terminalWsSend(this.sessionId, 'input', '\x03')
    },

    focusInput() {
      this.$nextTick(() => {
        this.$refs.terminalInput?.focus()
      })
    }
  },

  mounted() {
    this.renderOutput()
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
  padding: 12px 16px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5;
  color: #d4d4d8;
  background: #0a0a09;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-input-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #18191b;
  border-top: 1px solid #27272a;
}

.prompt {
  color: #22c55e;
  font-weight: bold;
  font-size: 14px;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f4f4f5;
  font-family: inherit;
  font-size: 14px;
}

.terminal-input::placeholder {
  color: #545459;
}

.terminal-input:disabled {
  cursor: not-allowed;
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
