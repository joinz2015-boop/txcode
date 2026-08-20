<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择模型</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="model-list" v-if="!loading">
          <div
            v-for="model in models"
            :key="model.id"
            class="model-item"
            :class="{ active: currentModel === model.name }"
            @click="handleSelect(model)"
          >
            <span class="model-name">{{ model.name }}</span>
            <span class="model-provider">{{ model.providerId }}</span>
          </div>
          <div v-if="models.length === 0" class="empty-hint">暂无可用模型</div>
        </div>
        <div v-else class="loading-hint">加载中...</div>
      </div>
    </div>
  </div>
</template>

<script>
import { getModels, setConfig } from '@/api/index'

export default {
  name: 'DesktopModelSelectDialog',
  props: {
    currentModel: { type: String, default: '' }
  },
  emits: ['close', 'select'],
  data() {
    return {
      models: [],
      loading: false
    }
  },
  mounted() {
    this.loadModels()
  },
  methods: {
    async loadModels() {
      this.loading = true
      try {
        const r = await getModels()
        this.models = r.data || []
      } catch (e) {
        console.error('加载模型列表失败:', e)
        this.models = []
      } finally {
        this.loading = false
      }
    },
    handleSelect(model) {
      const parts = model.name.split('/')
      const name = parts.length > 2 ? parts.slice(1).join('/') : model.name
      setConfig('defaultModel', name).catch(() => {})
      this.$emit('select', model)
      this.$emit('close')
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
  width: 420px; max-width: 90vw; max-height: 70vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 4px; }
.model-list { max-height: 360px; overflow-y: auto; }
.model-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; cursor: pointer; border-radius: 6px;
  transition: background 0.15s; font-size: 13px; color: var(--text-primary);
}
.model-item:hover { background: var(--bg-hover); }
.model-item.active { background: var(--accent-light); color: var(--accent); }
.model-item.active .model-provider { color: var(--accent); }
.model-name { font-weight: 500; }
.model-provider { color: var(--text-muted); font-size: 11px; }
.empty-hint, .loading-hint {
  text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;
}
</style>
