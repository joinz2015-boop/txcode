<template>
  <div class="titlebar">
    <div class="titlebar-left">
      <img :src="logoPng" class="titlebar-logo" />
      <span class="titlebar-title">txcode</span>
      <span class="titlebar-subtitle">/ {{ viewLabel }}</span>
    </div>
    <div class="titlebar-center" v-if="$route.name === 'coding'">
      <div class="mode-float">
        <button class="mode-tab" :class="{ active: desktopState.currentMode === 'code' }" @click="switchMode('code')">编码模式</button>
        <button class="mode-tab" :class="{ active: desktopState.currentMode === 'plan' }" @click="switchMode('plan')">方案模式</button>
      </div>
    </div>
    <div class="titlebar-right">
      <DesktopProjectSwitcher
        :currentProject="currentProject"
        :projects="projects"
        @selectProject="$emit('selectProject', $event)"
        @deleteProject="$emit('deleteProject', $event)"
        @openProject="$emit('openProject')"
      />
      <div class="titlebar-actions">
        <button class="win-btn" title="最小化" @click="minimizeWindow">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1" y="4" width="8" height="1.2" rx="0.6" fill="currentColor"/>
          </svg>
        </button>
        <button class="win-btn" title="最大化" @click="maximizeWindow">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1.2" y="1.2" width="7.6" height="7.6" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/>
          </svg>
        </button>
        <button class="win-btn close" title="关闭" @click="closeWindow">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopProjectSwitcher from '@/components/DesktopProjectSwitcher.vue'
import { minimizeWindow, maximizeWindow, closeWindow } from '@/utils/ipc'
import logoPng from '../../assets/logo.png'

const viewLabels = {
  coding: '编码',
  design: '设计',
  specs: '规范',
  skills: 'Skill',
  settings: '设置',
}

export default {
  name: 'DesktopTitleBar',
  components: { DesktopProjectSwitcher },
  inject: ['desktopState'],
  data() {
    return { logoPng }
  },
  props: {
    currentProject: { type: Object, default: () => ({ name: 'txcode', path: '', color: '#4f6ef7' }) },
    projects: { type: Array, default: () => [] },
  },
  computed: {
    viewLabel() {
      const routeName = this.$route.name
      return viewLabels[routeName] || '编码'
    },
  },
  methods: {
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    switchMode(mode) {
      this.desktopState.currentMode = mode
    },
  },
}
</script>

<style scoped>
.titlebar {
  background: var(--bg-titlebar);
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  user-select: none;
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}
.titlebar-left { flex: 1; display: flex; align-items: center; gap: 10px; }
.titlebar-logo { width: 24px; height: 24px; border-radius: 4px; object-fit: contain; }
.titlebar-center {
  flex: 0 0 auto;
  -webkit-app-region: no-drag;
}
.titlebar-right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; -webkit-app-region: no-drag; }
.titlebar-actions { display: flex; align-items: center; gap: 0; -webkit-app-region: no-drag; }
.win-btn {
  width: 40px; height: 30px; border: none; background: transparent;
  color: var(--text-muted); cursor: pointer; border-radius: 6px;
  transition: all 0.15s ease;
  display: flex; align-items: center; justify-content: center;
  -webkit-app-region: no-drag;
  line-height: 0;
}
.win-btn:hover { background: rgba(0,0,0,0.06); color: var(--text-primary); }
.win-btn:active { background: rgba(0,0,0,0.1); }
.win-btn.close:hover { background: #ef4444; color: #fff; }
.win-btn.close:active { background: #dc2626; color: #fff; }

.mode-float {
  display: inline-flex;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
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
.mode-tab.active { background: var(--accent); color: #fff; box-shadow: 0 2px 6px rgba(79, 110, 247, 0.3); }
</style>
