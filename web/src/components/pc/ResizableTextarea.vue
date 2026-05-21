<template>
  <div
    class="resizable-textarea-outer"
    :class="{ 'resize-hand-active': isResizing }"
  >
    <div
      v-if="showHandle"
      class="resize-hand"
      @mousedown="startResize"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    ></div>
    <el-input
      v-model="internalValue"
      type="textarea"
      :rows="currentRows"
      v-bind="$attrs"
    />
    <div
      v-if="showHandle && isHovering"
      class="resize-indicator"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'ResizableTextarea',
  props: {
    value: { type: String, default: '' },
    rows: { type: Number, default: 5 },
    minRows: { type: Number, default: 2 },
    maxRows: { type: Number, default: 20 }
  },
  data() {
    return {
      internalValue: this.value,
      currentRows: this.rows,
      isResizing: false,
      isHovering: false,
      startY: 0,
      startRows: 0
    }
  },
  computed: {
    showHandle() { return true }
  },
  watch: {
    value(val) { this.internalValue = val },
    internalValue(val) { this.$emit('input', val) }
  },
  mounted() {
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.stopResize)
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.stopResize)
  },
  methods: {
    handleMouseEnter() {
      this.isHovering = true
    },
    handleMouseLeave() {
      if (!this.isResizing) {
        this.isHovering = false
      }
    },
    startResize(e) {
      this.isResizing = true
      this.isHovering = false
      this.startY = e.clientY
      this.startRows = this.currentRows
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    },
    handleMouseMove(e) {
      if (!this.isResizing) return
      
      const deltaY = this.startY - e.clientY
      const rowHeight = 20
      const newRows = Math.round(this.startRows + deltaY / rowHeight)
      this.currentRows = Math.max(this.minRows, Math.min(this.maxRows, newRows))
    },
    stopResize() {
      if (this.isResizing) {
        this.isResizing = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }
}
</script>

<style scoped>
.resizable-textarea-outer { 
  position: relative; 
  display: flex; 
  flex-direction: column; 
}

.resize-hand {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  background: transparent;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-hand:hover,
.resize-hand-active .resize-hand {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.3) 0%, transparent 100%);
}

.resize-hand:hover::after,
.resize-hand-active::after {
  content: '';
  width: 40px;
  height: 4px;
  background: #3b82f6;
  border-radius: 2px;
  opacity: 0.8;
}

.resize-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: #3b82f6;
  border-radius: 2px;
  opacity: 0.6;
  pointer-events: none;
  z-index: 11;
}

.resize-hand-active { cursor: ns-resize; }

.resize-hand-active .resize-hand {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.3) 0%, transparent 100%);
}
</style>
