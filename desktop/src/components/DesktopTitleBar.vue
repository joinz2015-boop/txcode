<template>
  <div class="titlebar">
    <div class="titlebar-left">
      <div class="titlebar-logo">T</div>
      <span class="titlebar-title">txcode</span>
      <span class="titlebar-subtitle">/ {{ viewLabel }}</span>
    </div>
    <div class="titlebar-right">
      <DesktopProjectSwitcher
        :currentProject="currentProject"
        :projects="projects"
        @selectProject="$emit('selectProject', $event)"
      />
      <div class="titlebar-actions">
        <button class="win-btn" title="最小化" @click="minimizeWindow">&#x2014;</button>
        <button class="win-btn" title="最大化" @click="maximizeWindow">&#x25A1;</button>
        <button class="win-btn close" title="关闭" @click="closeWindow">&#x2715;</button>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopProjectSwitcher from '@/components/DesktopProjectSwitcher.vue'
import { minimizeWindow, maximizeWindow, closeWindow } from '@/utils/ipc'

const viewLabels = {
  coding: '编码',
  design: '设计',
  specs: '规范',
  skills: 'Skill 市场',
  settings: '设置'
}

export default {
  name: 'DesktopTitleBar',
  components: { DesktopProjectSwitcher },
  props: {
    currentView: { type: String, default: 'coding' },
    currentProject: { type: Object, default: () => ({ name: 'txcode', path: '', color: '#4f6ef7' }) },
    projects: { type: Array, default: () => [] }
  },
  computed: {
    viewLabel() {
      return viewLabels[this.currentView] || '编码'
    }
  },
  methods: {
    minimizeWindow,
    maximizeWindow,
    closeWindow
  }
}
</script>

<style scoped>
.titlebar {
  background: var(--bg-titlebar);
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  user-select: none;
  border-bottom: 1px solid var(--border);
}
.titlebar-left { display: flex; align-items: center; gap: 10px; }
.titlebar-logo {
  width: 24px; height: 24px; border-radius: 6px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
}
.titlebar-title { font-size: 14px; color: var(--text-primary); font-weight: 600; }
.titlebar-subtitle { font-size: 11px; color: var(--text-muted); }
.titlebar-right { display: flex; align-items: center; gap: 8px; }
.titlebar-actions { display: flex; align-items: center; gap: 2px; }
.win-btn {
  width: 34px; height: 28px; border: none; background: transparent;
  color: var(--text-muted); cursor: pointer; border-radius: 6px;
  font-size: 16px; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
}
.win-btn:hover { background: #dcdce4; color: var(--text-primary); }
.win-btn.close:hover { background: #ef4444; color: #fff; }
</style>
