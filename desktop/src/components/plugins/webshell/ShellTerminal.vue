<template>
  <div class="terminal-container" ref="container"></div>
</template>

<script>
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

export default {
  name: 'ShellTerminal',
  props: {
    onData: Function,
  },
  data() {
    return {
      term: null,
      fitAddon: null,
    }
  },
  methods: {
    initTerminal() {
      if (this.term) return
      this.term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
        },
        allowProposedApi: true,
      })
      this.fitAddon = new FitAddon()
      this.term.loadAddon(this.fitAddon)

      this.term.open(this.$refs.container)
      this.fitAddon.fit()

      this.term.onData((data) => {
        if (this.onData) {
          this.onData(data)
        }
      })

      this._resizeObserver = new ResizeObserver(() => {
        if (this.fitAddon) {
          try { this.fitAddon.fit() } catch {}
        }
      })
      this._resizeObserver.observe(this.$refs.container)
    },

    write(data) {
      if (this.term) {
        this.term.write(data)
      }
    },

    writeln(data) {
      if (this.term) {
        this.term.writeln(data)
      }
    },

    focus() {
      if (this.term) {
        this.term.focus()
      }
    },

    clear() {
      if (this.term) {
        this.term.clear()
      }
    },

    reset() {
      if (this.term) {
        this.term.reset()
      }
    },

    destroy() {
      if (this._resizeObserver) {
        this._resizeObserver.disconnect()
        this._resizeObserver = null
      }
      if (this.term) {
        this.term.dispose()
        this.term = null
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.initTerminal()
    })
  },
  beforeDestroy() {
    this.destroy()
  },
}
</script>

<style scoped>
.terminal-container {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
}
</style>
