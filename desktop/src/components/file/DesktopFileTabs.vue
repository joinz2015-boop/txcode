<template>
  <div class="file-tabs">
    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab"
        :class="{ active: tab.path === activePath, dirty: tab.dirty }"
        :title="tab.path"
        @click="activate(tab.path)"
        @auxclick="onAuxClick($event, tab.path)"
      >
        <span class="tab-icon" v-html="iconHtml(tab.name)"></span>
        <span class="tab-name">{{ tab.name }}</span>
        <span class="tab-dirty"></span>
        <span class="tab-close" @click.stop="closeTab(tab.path)">×</span>
      </div>
      <div class="tab-actions">
        <button class="s-btn" title="保存 (Ctrl+S)" @click="saveActive">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { fileSvg } from './fileIcons'

export default {
  name: 'DesktopFileTabs',
  inject: ['fileManager'],
  computed: {
    tabs() {
      return this.fileManager.state.tabs
    },
    activePath() {
      return this.fileManager.state.activePath
    }
  },
  methods: {
    iconHtml(name) {
      return fileSvg(name)
    },
    activate(path) {
      this.fileManager.activateTab(path)
    },
    closeTab(path) {
      this.fileManager.closeTab(path)
    },
    onAuxClick(e, path) {
      if (e.button === 1) this.closeTab(path)
    },
    saveActive() {
      this.fileManager.saveActive()
    }
  }
}
</script>

<style scoped>
.file-tabs {
  flex-shrink: 0;
  display: flex;
}
.tabs {
  height: 36px;
  min-height: 36px;
  display: flex;
  align-items: stretch;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  overflow-y: hidden;
  user-select: none;
  width: 100%;
}
.tabs::-webkit-scrollbar {
  height: 0;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  min-width: 120px;
  max-width: 200px;
  border-right: 1px solid var(--border);
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-secondary);
  background: transparent;
  position: relative;
  white-space: nowrap;
  transition: background 0.12s;
}
.tab:hover {
  background: var(--bg-hover);
}
.tab.active {
  background: var(--bg-code);
  color: var(--text-primary);
}
.tab.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
}
.tab-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-dirty {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yellow);
  flex-shrink: 0;
  display: none;
}
.tab.dirty .tab-dirty {
  display: block;
}
.tab-close {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  opacity: 0;
  transition: all 0.12s;
}
.tab:hover .tab-close {
  opacity: 1;
}
.tab-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}
.tab-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 0 6px;
  gap: 2px;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tab-actions .s-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;
}
.tab-actions .s-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
