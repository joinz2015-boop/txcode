<template>
  <div class="mode-float">
    <button
      class="mode-tab"
      :class="{ active: currentMode === 'code' }"
      @click="$emit('switchMode', 'code')"
    >编码模式</button>
    <button
      class="mode-tab"
      :class="{ active: currentMode === 'plan' }"
      @click="$emit('switchMode', 'plan')"
    >方案模式</button>
  </div>
</template>

<script>
export default {
  name: 'DesktopModeSwitcher',
  props: {
    currentMode: { type: String, default: 'code' }
  }
}
</script>

<style scoped>
.mode-float {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 2px;
}
.mode-tab {
  padding: 6px 20px;
  font-size: 12.5px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted);
  transition: all 0.2s;
  white-space: nowrap;
  font-weight: 500;
  font-family: inherit;
}
.mode-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.mode-tab.active { background: var(--accent); color: #fff; box-shadow: 0 2px 6px rgba(79,110,247,0.3); }
</style>
