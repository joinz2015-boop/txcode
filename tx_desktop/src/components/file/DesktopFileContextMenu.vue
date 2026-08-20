<template>
  <div
    v-if="visible"
    ref="menu"
    class="ctx-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div class="ctx-item" @click="emitAction('new-file')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
      新建文件
    </div>
    <div class="ctx-item" @click="emitAction('new-folder')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
      新建文件夹
    </div>
    <div v-if="isDir" class="ctx-item" @click="emitAction('collapse-all')">折叠全部</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" @click="emitAction('copy-link')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      复制链接
    </div>
    <div class="ctx-item" @click="emitAction('rename')">重命名</div>
    <div class="ctx-item danger" @click="emitAction('delete')">删除</div>
  </div>
</template>

<script>
export default {
  name: 'DesktopFileContextMenu',
  props: {
    visible: { type: Boolean, default: false },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    node: { type: Object, default: null }
  },
  computed: {
    isDir() {
      return !!(this.node && this.node.type === 'dir')
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => this.adjustPosition())
      }
    }
  },
  mounted() {
    document.addEventListener('mousedown', this.onDocMousedown)
    document.addEventListener('contextmenu', this.onDocContextmenu)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onDocMousedown)
    document.removeEventListener('contextmenu', this.onDocContextmenu)
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    onDocMousedown(e) {
      if (!this.visible) return
      if (this.$refs.menu && this.$refs.menu.contains(e.target)) return
      this.close()
    },
    onDocContextmenu(e) {
      if (!this.visible) return
      const t = e.target
      if (t && t.closest && t.closest('.tree-row')) return
      this.close()
    },
    onKeydown(e) {
      if (!this.visible) return
      if (e.key === 'Escape') this.close()
    },
    adjustPosition() {
      const el = this.$refs.menu
      if (!el) return
      const rect = el.getBoundingClientRect()
      let left = this.x
      let top = this.y
      if (left + rect.width > window.innerWidth - 8) {
        left = window.innerWidth - rect.width - 8
      }
      if (top + rect.height > window.innerHeight - 8) {
        top = window.innerHeight - rect.height - 8
      }
      el.style.left = Math.max(0, left) + 'px'
      el.style.top = Math.max(0, top) + 'px'
    },
    emitAction(action) {
      this.close()
      this.$emit(action)
    },
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.ctx-menu {
  position: fixed;
  min-width: 160px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 4px;
  user-select: none;
  z-index: 9999;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12.5px;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 5px;
  white-space: nowrap;
}
.ctx-item:hover {
  background: var(--bg-hover);
}
.ctx-item.danger {
  color: var(--red);
}
.ctx-sep {
  height: 1px;
  background: var(--border);
  margin: 4px 6px;
}
</style>
