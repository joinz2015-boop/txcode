<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择设计</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div v-if="loading" class="loading-hint">加载中...</div>
        <div v-else-if="designs.length === 0" class="empty-hint">暂无设计文件</div>
        <div v-for="item in designs" :key="item.path" class="design-item" :class="{ selected: selected === item.path }" @click="selected = item.path">
          <span class="design-icon">🎨</span>
          <span class="design-name">{{ item.name }}</span>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="confirmSelect" :disabled="!selected">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
import { browseFilesystem } from '@/api/index'

export default {
  name: 'DesktopDesignSelectDialog',
  emits: ['close', 'select'],
  data() {
    return {
      designs: [],
      loading: false,
      selected: ''
    }
  },
  mounted() {
    this.loadDesigns()
  },
  methods: {
    async loadDesigns() {
      this.loading = true
      try {
        const r = await browseFilesystem('.txcode/design')
        const entries = (r.data && r.data.entries) || []
        this.designs = entries.filter(e => !e.isDirectory).map(e => ({
          name: e.name,
          path: e.path
        }))
      } catch (e) {
        this.designs = []
      } finally {
        this.loading = false
      }
    },
    confirmSelect() {
      if (this.selected) {
        this.$emit('select', this.selected)
        this.$emit('close')
      }
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 460px; max-width: 90vw; max-height: 70vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 12px; }
.design-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px;
  cursor: pointer; transition: background 0.1s; margin-bottom: 4px;
}
.design-item:hover { background: var(--bg-hover); }
.design-item.selected { background: var(--accent-light); border: 1px solid var(--accent); }
.design-icon { font-size: 16px; flex-shrink: 0; }
.design-name { font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint, .loading-hint { text-align: center; color: var(--text-muted); padding: 30px; font-size: 13px; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
