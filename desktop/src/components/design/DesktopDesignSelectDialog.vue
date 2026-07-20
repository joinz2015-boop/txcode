<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog design-dialog">
      <div class="dialog-header">
        <span>选择设计</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="design-left">
          <div class="page-tree">
            <div v-if="loading" class="empty-hint">加载中...</div>
            <div v-else-if="treeNodes.length === 0" class="empty-hint">
              暂无设计页面，请在 .txcode/design/ 目录下添加 HTML 文件
            </div>
            <DesktopFileSelectTreeNode
              v-else
              v-for="node in treeNodes"
              :key="node.path"
              :node="node"
              :level="0"
              :selectedPath="selectedPath"
              :expandedPaths="expandedPaths"
              @select="handleSelect"
              @open-file="handleSelect"
              @load-children="handleLoadChildren"
              @expand-path="onExpandPath"
              @collapse-path="onCollapsePath"
            />
          </div>
          <div class="left-footer">
            <span class="selected-info">{{ selectedRelativePath || '未选择' }}</span>
            <button class="btn-confirm" :disabled="!selectedPath" @click="confirmSelect">确认选择</button>
          </div>
        </div>

        <div class="design-right">
          <div class="preview-toolbar">
            <div class="device-btns">
              <button :class="{ active: currentDevice === 'web' }" @click="setDevice('web')">Web</button>
              <button :class="{ active: currentDevice === 'pad' }" @click="setDevice('pad')">Pad</button>
              <button :class="{ active: currentDevice === 'app' }" @click="setDevice('app')">App</button>
            </div>
            <button class="btn-refresh" title="刷新预览" @click="refreshPreview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path></svg>
            </button>
            <span class="page-indicator">当前：{{ selectedPageName || '—' }}</span>
          </div>
          <div class="preview-frame">
            <div class="device-frame" :class="'device-' + currentDevice">
              <div v-if="currentDevice === 'web' || currentDevice === 'pad'" class="browser-bar">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <div v-if="previewSrc" class="preview-wrapper">
                <iframe
                  :key="previewKey"
                  :src="previewSrc"
                  class="preview-iframe"
                  sandbox="allow-scripts allow-same-origin"
                  @load="onIframeLoad"
                />
              </div>
              <div v-else class="preview-empty">请选择左侧页面预览</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { browseFilesystem, getBaseURL } from '@/api/index'
import DesktopFileSelectTreeNode from '@/components/file/DesktopFileSelectTreeNode.vue'

export default {
  name: 'DesktopDesignSelectDialog',
  components: { DesktopFileSelectTreeNode },
  emits: ['close', 'select'],
  data() {
    return {
      loading: false,
      treeNodes: [],
      selectedPath: '',
      selectedPageName: '',
      selectedRelativePath: '',
      expandedPaths: new Set(),
      currentDevice: 'web',
      previewSrc: '',
      previewKey: 0,
      designBasePath: '.txcode/design',
      nodeMap: {}
    }
  },
  mounted() {
    this.loadDesigns()
  },
  methods: {
    async loadDesigns(path) {
      const browsePath = path || this.designBasePath
      if (!path) this.loading = true
      try {
        const r = await browseFilesystem(browsePath)
        const d = (r && r.data) || {}
        const items = (d.items || [])
          .filter(e => {
            if (e.name === 'session.json') return false
            if (e.is_directory) return true
            return e.name.endsWith('.html')
          })
        items.sort((a, b) => {
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        })
        const nodes = items.map(e => {
          const node = {
            name: e.name,
            path: e.path,
            isDirectory: e.is_directory,
            hasChildren: e.is_directory
          }
          if (!path) {
            this.nodeMap[this.toRelativeDesignPath((e.path || '').replace(/\\/g, '/'))] = node
          }
          return node
        })
        if (path) return nodes
        this.treeNodes = nodes
      } catch (e) {
        if (!path) this.treeNodes = []
      } finally {
        if (!path) this.loading = false
      }
      return []
    },
    handleSelect(node) {
      if (node.isDirectory) return
      this.selectedPath = node.path
      this.selectedPageName = node.name.replace('.html', '')
      this.selectedRelativePath = this.getRelativePath(node.path)
      this.loadPreview(node.path)
    },
    async handleLoadChildren({ path, callback }) {
      const children = await this.loadDesigns(path)
      if (children && children.length) {
        children.forEach(node => {
          this.nodeMap[this.toRelativeDesignPath((node.path || '').replace(/\\/g, '/'))] = node
        })
      }
      callback(children || [])
    },
    getRelativePath(absPath) {
      const normalized = (absPath || '').replace(/\\/g, '/')
      const marker = '.txcode/design/'
      const idx = normalized.indexOf(marker)
      if (idx === -1) return normalized
      return normalized.substring(idx)
    },
    toRelativeDesignPath(fullPath) {
      const marker = '.txcode/design/'
      const idx = fullPath.indexOf(marker)
      return idx !== -1 ? fullPath.substring(idx) : fullPath
    },
    loadPreview(filePath) {
      const relativePath = this.getRelativePath(filePath)
        .replace(/^\.txcode\/design\//, '')
        .replace(/\\/g, '/')
      this.previewSrc = `${getBaseURL()}/design_html/${encodeURI(relativePath)}?_t=${Date.now()}`
      this.previewKey++
    },
    onIframeLoad() {
      try {
        const iframe = this.$el && this.$el.querySelector('.preview-iframe')
        if (!iframe || !iframe.contentWindow) return
        const pathname = iframe.contentWindow.location.pathname
        const filePath = '.txcode/design' + decodeURIComponent(
          pathname.replace(/^\/design_html/, '')
        )
        const key = this.toRelativeDesignPath(filePath.replace(/\\/g, '/'))
        const item = this.nodeMap[key]
        if (!item || this.selectedPath === item.path) return
        this.selectedPath = item.path
        this.selectedPageName = item.name.replace('.html', '')
        this.selectedRelativePath = this.getRelativePath(item.path)
        this.expandAncestors(item.path)
      } catch (e) {
        // cross-origin restriction, ignore
      }
    },
    expandAncestors(absPath) {
      const parts = absPath.replace(/\\/g, '/').split('/')
      let cumulative = ''
      const newSet = new Set(this.expandedPaths)
      for (let i = 0; i < parts.length - 1; i++) {
        cumulative += (i === 0 ? '' : '/') + parts[i]
        if (cumulative) newSet.add(cumulative)
      }
      this.expandedPaths = newSet
    },
    onExpandPath(p) {
      const s = new Set(this.expandedPaths)
      s.add((p || '').replace(/\\/g, '/'))
      this.expandedPaths = s
    },
    onCollapsePath(p) {
      const s = new Set(this.expandedPaths)
      s.delete((p || '').replace(/\\/g, '/'))
      this.expandedPaths = s
    },
    setDevice(device) {
      this.currentDevice = device
      if (this.selectedPath) {
        this.loadPreview(this.selectedPath)
      }
    },
    refreshPreview() {
      if (this.selectedPath) {
        this.loadPreview(this.selectedPath)
      }
    },
    confirmSelect() {
      if (this.selectedPath) {
        this.$emit('select', this.selectedPath)
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
  display: flex; flex-direction: column;
}
.design-dialog { width: 1200px; max-width: 95vw; height: 85vh; max-height: 720px; }
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  flex-shrink: 0;
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.design-left {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}
.page-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
}
.left-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  background: #fff;
}
.selected-info {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  background: var(--bg-input);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-confirm {
  padding: 6px 14px;
  background: var(--accent);
  border: none;
  border-radius: 5px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}
.btn-confirm:hover { filter: brightness(1.08); }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.design-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  min-width: 0;
}
.preview-toolbar {
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.device-btns { display: flex; gap: 2px; background: var(--bg-input); border-radius: 5px; padding: 2px; }
.device-btns button {
  padding: 4px 10px; border: none; background: transparent;
  border-radius: 3px; cursor: pointer; font-size: 11px; color: var(--text-muted);
  font-family: inherit; transition: all 0.15s;
}
.device-btns button.active { background: var(--accent); color: #fff; }
.device-btns button:hover:not(.active) { color: var(--text-primary); }
.btn-refresh {
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; padding: 4px 6px; border-radius: 4px;
  display: flex; align-items: center;
}
.btn-refresh:hover { color: var(--text-primary); background: var(--bg-hover); }
.page-indicator {
  margin-left: auto; font-size: 11px; color: var(--text-muted); flex-shrink: 0;
}
.preview-frame {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  background: #e5e5e5;
}
.device-frame {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}
.device-web {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
}
.device-pad {
  width: 768px;
  min-width: 768px;
  background: #1a1a1a;
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 0 0 2px #ddd, 0 0 0 4px #f5f5f5, 0 0 0 6px #bbb, 0 12px 30px rgba(0,0,0,0.3);
  align-self: center;
}
.device-app {
  width: 375px;
  min-width: 375px;
  background: #1a1a1a;
  border-radius: 32px;
  padding: 8px;
  box-shadow: 0 0 0 2px #bbb, 0 0 0 4px #f5f5f5, 0 0 0 6px #999, 0 12px 30px rgba(0,0,0,0.3);
  align-self: center;
}
.device-app::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 22px;
  background: #1a1a1a;
  border-radius: 0 0 14px 14px;
  z-index: 10;
}
.device-app::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: #555;
  border-radius: 2px;
  z-index: 10;
}
.browser-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; background: #e8e8e8; border-radius: 6px 6px 0 0; flex-shrink: 0;
}
.device-pad .browser-bar { background: #2a2a2a; padding: 6px 10px; border-radius: 6px 6px 0 0; }
.browser-dot { width: 10px; height: 10px; border-radius: 50%; }
.browser-dot.red { background: #ff5f57; }
.browser-dot.yellow { background: #febc2e; }
.browser-dot.green { background: #28c840; }
.preview-wrapper {
  flex: 1; min-height: 0; overflow: hidden; border-radius: 0 0 6px 6px;
}
.device-app .preview-wrapper {
  border-radius: 28px;
  margin-top: 16px;
  margin-bottom: 6px;
}
.device-pad .preview-wrapper { border-radius: 8px; }
.preview-iframe {
  width: 100%; height: 100%; border: none; background: #fff;
  border-radius: inherit;
}
.preview-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 13px; background: #fff;
  border-radius: 6px; min-height: 200px;
}
.device-pad .preview-empty, .device-app .preview-empty {
  border-radius: 8px;
}
.empty-hint { text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; }
</style>
