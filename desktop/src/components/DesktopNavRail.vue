<template>
  <div class="nav-rail">
    <a class="nav-item" :class="{ active: currentView === 'coding' }" @click="$emit('navigate', 'coding')" title="编码">
      <span class="nav-item-label">编码</span>
    </a>
    <a class="nav-item" :class="{ active: currentView === 'design' }" @click="$emit('navigate', 'design')" title="设计">
      <span class="nav-item-label">设计</span>
    </a>
    <a class="nav-item" :class="{ active: currentView === 'settings' }" @click="$emit('navigate', 'settings')" title="设置">
      <span class="nav-item-label">设置</span>
    </a>
    <div class="nav-spacer"></div>
  </div>
</template>

<script>
export default {
  name: 'DesktopNavRail',
  props: {
    currentView: { type: String, default: 'coding' }
  }
}
</script>

<style scoped>
.nav-rail {
  width: 68px; min-width: 68px; max-width: 68px;
  background: #f0f0f5; display: flex; flex-direction: column;
  align-items: center; padding: 12px 0; gap: 4px;
  border-right: 1px solid var(--border); user-select: none;
  flex-shrink: 0;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  width: 52px; padding: 8px 4px; border-radius: 8px; cursor: pointer;
  color: var(--text-muted); text-decoration: none; font-size: 11px;
  transition: all 0.15s; border: 1px solid transparent;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-secondary); }
.nav-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.nav-item-label { font-size: 10.5px; white-space: nowrap; }
.nav-spacer { flex: 1; }
</style>
