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
    <textarea
      v-model="internalValue"
      :rows="currentRows"
      v-bind="$attrs"
      v-on="forwardListeners"
      @paste="handlePaste"
    ></textarea>
    <div
      v-if="showHandle && isHovering"
      class="resize-indicator"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'DesktopResizableTextarea',
  inheritAttrs: false,
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
    showHandle() { return true },
    forwardListeners() {
      const listeners = { ...this.$listeners }
      delete listeners.input
      return listeners
    }
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
    },
    handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles = []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          imageFiles.push(item.getAsFile())
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        this.$emit('paste-image', imageFiles)
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

.resizable-textarea-outer textarea {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  line-height: 1.5;
  background: transparent;
  resize: none;
  box-sizing: border-box;
}

.resizable-textarea-outer textarea:disabled {
  opacity: 0.7;
  background: #f9fafb;
}

.resizable-textarea-outer textarea::placeholder {
  color: var(--text-muted);
}
</style>
