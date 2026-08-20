<template>
  <div class="minimap" v-show="visible" ref="minimap" @mousedown.prevent="onMouseDown">
    <div class="minimap-inner" :style="{ height: innerHeight + 'px' }">
      <div v-for="(cls, idx) in barClasses" :key="idx" class="m-line" :class="cls"></div>
    </div>
    <div class="minimap-viewport" :style="{ top: viewportTop + 'px', height: viewportHeight + 'px' }"></div>
  </div>
</template>

<script>
const LINE_STEP = 3

export default {
  name: 'DesktopGitMinimap',
  props: {
    lines: { type: Array, default: () => [] },
    scrollTop: { type: Number, default: 0 },
    scrollHeight: { type: Number, default: 1 },
    clientHeight: { type: Number, default: 1 },
    visible: { type: Boolean, default: true }
  },
  computed: {
    barClasses() {
      const n = this.lines.length
      if (n === 0) return []
      if (n <= 4000) {
        return this.lines.map(l => l.type === 'removed' ? 'deleted' : (l.type === 'added' ? 'added' : ''))
      }
      const step = Math.ceil(n / 4000)
      const result = []
      for (let i = 0; i < n; i += step) {
        let cls = ''
        const end = Math.min(n, i + step)
        for (let j = i; j < end; j++) {
          const t = this.lines[j].type
          if (t === 'removed') {
            cls = 'deleted'
            break
          }
          if (t === 'added') cls = 'added'
        }
        result.push(cls)
      }
      return result
    },
    innerHeight() {
      return this.lines.length * LINE_STEP
    },
    viewportTop() {
      if (!this.scrollHeight) return 0
      return (this.scrollTop / this.scrollHeight) * this.innerHeight
    },
    viewportHeight() {
      if (!this.scrollHeight) return 20
      return Math.max(20, (this.clientHeight / this.scrollHeight) * this.innerHeight)
    }
  },
  methods: {
    onMouseDown(e) {
      const rect = this.$refs.minimap.getBoundingClientRect()
      const move = (ev) => {
        const ratio = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height))
        this.$emit('jump', ratio)
      }
      move(e)
      const up = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    }
  }
}
</script>

<style scoped>
.minimap {
  width: 70px;
  min-width: 70px;
  background: var(--bg-side);
  border-left: 1px solid var(--border);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.minimap-inner {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}
.m-line {
  height: 2px;
  margin: 0.5px 4px;
  border-radius: 1px;
  background: #d1d3dc;
}
.m-line.added {
  background: var(--green);
  opacity: 0.7;
}
.m-line.deleted {
  background: var(--red);
  opacity: 0.7;
}
.minimap-viewport {
  position: absolute;
  left: 0;
  right: 0;
  border: 1.5px solid var(--accent);
  background: rgba(79, 110, 247, 0.10);
  border-radius: 3px;
  pointer-events: none;
}
</style>
