<template>
  <div class="status-bar">
    <span :class="disabled ? 'status-thinking' : 'status-ready'">
      <span v-if="disabled" class="thinking-spinner"></span>
      {{ disabled ? '思考中' : '✓ 就绪' }}
    </span>
    <span class="sep">|</span>
    <span class="status-action" @click="$emit('action', 'open-model')" @mousedown.prevent>模型: {{ modelName || '-' }} ▾</span>
    <span class="sep">|</span>
    <span>会话: {{ shortId }}</span>
    <span class="sep">|</span>
    <span>token: {{ promptTokens || 0 }}</span>
    <template v-for="action in actions">
      <span :key="action.event + '-sep'" class="sep">|</span>
      <span :key="action.event" class="status-action" @click="$emit('action', action.event)" @mousedown.prevent>{{ action.label }}</span>
    </template>
  </div>
</template>

<script>
export default {
  name: 'ChatStatusBar',
  props: {
    sessionId: { type: String, default: '' },
    modelName: { type: String, default: '' },
    promptTokens: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    actions: { type: Array, default: () => [] },
  },
  computed: {
    shortId() {
      return this.sessionId ? this.sessionId.slice(0, 8) : '未创建'
    },
  },
}
</script>

<style scoped>
.status-bar { display: flex; gap: 8px; align-items: center; padding: 6px 16px; font-size: 12px; color: var(--color-textMuted); border-top: 1px solid var(--color-border); flex-shrink: 0; flex-wrap: wrap; }
.sep { color: var(--color-border); }
.status-ready { color: var(--color-success, #22c55e); }
.status-thinking { color: var(--color-accent); display: flex; align-items: center; gap: 6px; }
.status-action { cursor: pointer; }
.status-action:hover { color: var(--color-accent); }
.thinking-spinner { width: 10px; height: 10px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
