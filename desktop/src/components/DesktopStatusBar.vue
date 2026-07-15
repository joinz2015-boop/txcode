<template>
  <div class="statusbar">
    <div class="statusbar-left">
      <span class="status-item">📁 {{ currentProjectName }}</span>
      <span class="status-item">
        <span class="status-dot green"></span> {{ currentModel }}
      </span>
      <span class="status-item">Node.js {{ nodeVersion || 'v20' }}</span>
    </div>
    <div class="statusbar-right">
      <span class="status-item" style="color:var(--text-muted);">v{{ appVersion }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopStatusBar',
  props: {
    currentProjectName: { type: String, default: 'txcode' },
    currentModel: { type: String, default: 'DeepSeek V3' },
    nodeVersion: { type: String, default: '' },
    appVersion: { type: String, default: '1.0.55' }
  }
}
</script>

<style scoped>
.statusbar {
  height: 26px;
  min-height: 26px;
  background: var(--bg-titlebar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-size: 11px;
  color: var(--text-muted);
  user-select: none;
  border-top: 1px solid var(--border);
}
.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: color 0.15s;
  color: var(--text-muted);
}
.status-item:hover {
  color: var(--text-primary);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot.green {
  background: var(--green);
  box-shadow: 0 0 4px rgba(16,185,129,0.4);
}
</style>
