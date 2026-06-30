<template>
  <el-dialog
    :visible="visible"
    title="选择设计"
    width="1200px"
    top="3vh"
    :close-on-click-modal="false"
    @update:visible="handleVisibleChange"
    @close="handleClose"
    class="design-select-dialog"
  >
    <div class="dialog-body">
      <div class="design-left">
        <div class="page-tree">
          <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted text-sm">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
          </div>
          <div v-else-if="fileTreeData.length === 0" class="empty-state">
            暂无设计页面，请在 .txcode/design/ 目录下添加 HTML 文件
          </div>
          <file-tree-node
            v-else
            v-for="node in fileTreeData"
            :key="node.path"
            :node="node"
            :level="0"
            :selected-path="selectedPath"
            :expanded-paths="expandedPaths"
            @select="handleSelect"
            @open-file="handleOpenFile"
            @load-children="handleLoadChildren"
            @expand-path="onExpandPath"
            @collapse-path="onCollapsePath"
          />
        </div>
        <div class="footer">
          <span class="selected-info">{{ selectedRelativePath || '未选择' }}</span>
          <button class="btn-confirm" :disabled="!selectedPath" @click="handleConfirm">确认选择</button>
        </div>
      </div>

      <div class="design-right">
        <div class="preview-toolbar">
          <div class="device-btns">
            <button :class="{ active: currentDevice === 'web' }" @click="setDevice('web')">💻 Web</button>
            <button :class="{ active: currentDevice === 'pad' }" @click="setDevice('pad')">📱 Pad</button>
            <button :class="{ active: currentDevice === 'app' }" @click="setDevice('app')">📱 App</button>
          </div>
          <div class="preview-actions">
            <button title="刷新预览" @click="refreshPreview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path></svg>
            </button>
          </div>
          <span class="page-indicator">当前：{{ selectedPageName || '—' }}</span>
        </div>
        <div class="preview-frame">
          <div class="device-frame" :class="'device-frame-' + currentDevice" id="previewWrapper">
            <div v-if="currentDevice === 'web' || currentDevice === 'pad'" class="browser-toolbar">
              <div class="browser-dots">
                <span class="red"></span>
                <span class="yellow"></span>
                <span class="green"></span>
              </div>
              <span class="browser-url">{{ selectedRelativePath || '/' }}</span>
            </div>
            <div v-if="previewSrc" class="preview-content-wrapper">
              <iframe
                v-if="previewSrc"
                :src="previewSrc"
                class="preview-content"
                sandbox="allow-scripts allow-same-origin"
                @load="onIframeNav"
              />
            </div>
            <div v-else class="preview-empty">
              请选择左侧页面预览
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import FileTreeNode from '../file/FileTreeNode.vue'
import { api } from '../../../api/index.js'

export default {
  name: 'DesignSelectDialog',
  components: { FileTreeNode },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      browseResult: { current_path: '', parent_path: null, items: [] },
      selectedPath: '',
      selectedPageName: '',
      selectedPagePath: '',
      selectedRelativePath: '',
      expandedPaths: new Set(),
      currentDevice: 'web',
      previewSrc: '',
      designBasePath: '.txcode/design'
    }
  },
  computed: {
    fileTreeData() {
      const items = this.browseResult.items
        .filter(item => {
          if (item.name === 'session.json') return false
          if (item.is_directory) return true
          return item.name.endsWith('.html')
        })
        .map(item => ({
          name: item.name,
          path: item.path,
          is_directory: item.is_directory,
          is_drive: false,
          size: item.size,
          has_children: item.is_directory,
          expanded: false,
          children: []
        }))
      return items.sort((a, b) => {
        if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
        return a.is_directory ? -1 : 1
      })
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.initBrowse()
        this.selectedPath = ''
        this.selectedPageName = ''
        this.selectedPagePath = ''
        this.selectedRelativePath = ''
        this.previewSrc = ''
        this.expandedPaths = new Set()
        this.currentDevice = 'web'
      }
    }
  },
  methods: {
    async initBrowse() {
      this.loading = true
      try {
        const res = await api.browseFilesystem(this.designBasePath)
        this.browseResult = res.data
      } catch (e) {
        console.error('Browse design dir failed:', e)
        this.browseResult = { current_path: this.designBasePath, parent_path: '', items: [] }
      } finally {
        this.loading = false
      }
    },

    getRelativePath(absPath) {
      const normalized = absPath.replace(/\\/g, '/')
      const marker = '.txcode/design/'
      const idx = normalized.indexOf(marker)
      if (idx === -1) return absPath
      return normalized.substring(idx)
    },

    handleSelect(node) {
      if (node.is_directory) return
      this.selectedPath = node.path
      this.selectedPagePath = node.path
      this.selectedPageName = node.name.replace('.html', '')
      this.selectedRelativePath = this.getRelativePath(node.path)
      this.loadPreview(node.path)
    },

    handleOpenFile(node) {
      this.handleSelect(node)
    },

    async handleLoadChildren({ path, callback }) {
      try {
        const res = await api.browseFilesystem(path)
        const children = (res.data.items || [])
          .filter(item => {
            if (item.name === 'session.json') return false
            if (item.is_directory) return true
            return item.name.endsWith('.html')
          })
          .map(item => ({
            name: item.name,
            path: item.path,
            is_directory: item.is_directory,
            is_drive: false,
            size: item.size,
            has_children: item.is_directory,
            expanded: false,
            children: []
          }))
        callback(children.sort((a, b) => {
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        }))
      } catch (e) {
        console.error('Load children failed:', e)
        callback([])
      }
    },

    onExpandPath(path) {
      const newSet = new Set(this.expandedPaths)
      newSet.add(path)
      this.expandedPaths = newSet
    },

    onCollapsePath(path) {
      const newSet = new Set(this.expandedPaths)
      newSet.delete(path)
      this.expandedPaths = newSet
    },

    loadPreview(filePath) {
      const relativePath = this.getRelativePath(filePath)
        .replace(/^\.txcode\/design\//, '')
        .replace(/\\/g, '/')
      this.previewSrc = `/design_html/${encodeURI(relativePath)}?_t=${Date.now()}`
      console.log('[DesignSelect] loadPreview previewSrc:', this.previewSrc)
    },

    onIframeNav() {
      try {
        const iframe = this.$el?.querySelector?.('.preview-content')
        if (!iframe || !iframe.contentWindow) {
          console.log('[DesignSelect] onIframeNav: iframe not ready')
          return
        }
        const pathname = iframe.contentWindow.location.pathname
        console.log('[DesignSelect] onIframeNav pathname:', pathname)
        const filePath = '.txcode/design' + decodeURIComponent(
          pathname.replace(/^\/design_html/, '')
        )
        console.log('[DesignSelect] onIframeNav filePath:', filePath)
        const found = this.findNodeByPath(this.fileTreeData, filePath)
        console.log('[DesignSelect] onIframeNav found:', found?.path || 'NOT FOUND')
        if (!found) return
        if (this.selectedPath === found.path) {
          console.log('[DesignSelect] onIframeNav: already selected, skip')
          return
        }
        console.log('[DesignSelect] onIframeNav: selecting', found.path)
        this.handleSelect(found)
        this.expandAncestors(filePath)
      } catch (e) {
        console.log('[DesignSelect] onIframeNav error:', e)
      }
    },

    findNodeByPath(nodes, targetPath) {
      if (!nodes || !nodes.length) return null
      const target = targetPath.replace(/\\/g, '/')
      for (const node of nodes) {
        const nodePath = (node.path || '').replace(/\\/g, '/')
        // 统一用相对路径比较（截取 .txcode/design/ 之后的部分）
        const nodeRel = this.toRelativeDesignPath(nodePath)
        const targetRel = this.toRelativeDesignPath(target)
        if (nodeRel === targetRel) return node
        if (node.children && node.children.length) {
          const found = this.findNodeByPath(node.children, target)
          if (found) return found
        }
      }
      return null
    },

    toRelativeDesignPath(fullPath) {
      const marker = '.txcode/design/'
      const idx = fullPath.indexOf(marker)
      return idx !== -1 ? fullPath.substring(idx) : fullPath
    },

    expandAncestors(targetPath) {
      const parts = targetPath.replace(/\\/g, '/').split('/')
      let cumulative = ''
      const newSet = new Set(this.expandedPaths)
      for (let i = 0; i < parts.length - 1; i++) {
        cumulative += (i === 0 ? '' : '/') + parts[i]
        newSet.add(cumulative)
      }
      console.log('[DesignSelect] expandAncestors:', [...newSet])
      this.expandedPaths = newSet
    },

    setDevice(device) {
      this.currentDevice = device
      if (this.selectedPagePath) {
        this.loadPreview(this.selectedPagePath)
      }
    },

    refreshPreview() {
      if (this.selectedPagePath) {
        this.loadPreview(this.selectedPagePath)
      }
    },

    handleConfirm() {
      if (!this.selectedPath) return
      this.$emit('select', {
        id: this.selectedPath,
        name: this.selectedPageName,
        path: this.selectedRelativePath,
        absPath: this.selectedPagePath
      })
      this.$emit('update:visible', false)
    },

    handleClose() {
      this.$emit('close')
    },

    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    }
  }
}
</script>

<style scoped>
.dialog-body {
  display: flex;
  height: 620px;
  overflow: hidden;
}

/* 左侧页面列表 */
.design-left {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  background: #121212;
}

.page-tree {
  flex: 1;
  overflow: auto;
  padding: 8px 4px;
}
.empty-state {
  padding: 30px;
  text-align: center;
  color: #71717a;
  font-size: 13px;
}

.design-left .footer {
  padding: 10px 12px;
  border-top: 1px solid #27272a;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.selected-info {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  background: #27272a;
  border-radius: 6px;
  font-size: 13px;
  color: #a1a1aa;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-confirm {
  padding: 8px 18px;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-confirm:hover { background: #2563eb; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* 右侧预览区 */
.design-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  min-width: 0;
}
.preview-toolbar {
  padding: 8px 12px;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.device-btns {
  display: flex;
  gap: 2px;
  background: #333;
  border-radius: 6px;
  padding: 2px;
}
.device-btns button {
  padding: 5px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #999;
  transition: all 0.15s;
  font-family: inherit;
}
.device-btns button.active { background: #555; color: #fff; }
.device-btns button:hover:not(.active) { color: #ccc; }

.preview-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}
.preview-actions button {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
}
.preview-actions button:hover { color: #fff; background: #333; }

.page-indicator {
  margin-left: auto;
  font-size: 12px;
  color: #666;
  font-family: system-ui, sans-serif;
  flex-shrink: 0;
}

.preview-frame {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  background: #2a2a2a;
}

/* 设备外壳 */
.device-frame {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.device-frame-app {
  width: 390px;
  min-width: 390px;
  background: #1a1a1a;
  border-radius: 36px;
  padding: 8px;
  box-shadow:
    0 0 0 2px #333,
    0 0 0 4px #1a1a1a,
    0 0 0 6px #444,
    0 20px 40px rgba(0,0,0,0.5);
  align-self: center;
}
.device-frame-app::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 25px;
  background: #1a1a1a;
  border-radius: 0 0 16px 16px;
  z-index: 10;
}
.device-frame-app::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  background: #444;
  border-radius: 2px;
  z-index: 10;
}

.device-frame-web {
  width: 100%;
  max-width: 100%;
  background: #2d2d2d;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  align-self: stretch;
}

.device-frame-pad {
  width: 800px;
  min-width: 800px;
  background: #1a1a1a;
  border-radius: 16px;
  padding: 10px;
  box-shadow:
    0 0 0 2px #444,
    0 0 0 4px #2a2a2a,
    0 0 0 6px #555,
    0 20px 40px rgba(0,0,0,0.5);
  align-self: center;
}
.device-frame-pad::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 50%;
  z-index: 10;
}

/* 浏览器工具栏 */
.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin-bottom: 10px;
  background: #3a3a3a;
  border-radius: 6px;
  flex-shrink: 0;
}
.device-frame-pad .browser-toolbar {
  padding: 4px 8px;
  background: #2a2a2a;
  border-radius: 4px;
  margin-bottom: 8px;
}
.device-frame-web .browser-toolbar { margin-bottom: 10px; }

.browser-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.browser-dots span {
  width: 10px; height: 10px;
  border-radius: 50%;
}
.browser-dots .red { background: #ff5f57; }
.browser-dots .yellow { background: #febc2e; }
.browser-dots .green { background: #28c840; }

.browser-url {
  flex: 1;
  background: #2d2d2d;
  color: #a0a0a0;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  text-align: center;
  font-family: system-ui, sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.device-frame-pad .browser-url {
  background: #1a1a1a;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 3px;
}

.preview-content-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 4px;
}
.device-frame-app .preview-content-wrapper {
  border-radius: 28px;
  margin-top: 16px;
  margin-bottom: 8px;
}

.preview-content {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
  border-radius: inherit;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
  background: #fff;
  border-radius: 4px;
}

.device-frame-app .preview-content,
.device-frame-app .preview-empty {
  border-radius: 28px;
}
.device-frame-web .preview-content,
.device-frame-web .preview-empty {
  border-radius: 4px;
}
.device-frame-pad .preview-content,
.device-frame-pad .preview-empty {
  border-radius: 8px;
}

/* FileTreeNode 深色主题适配 */
:deep(.file-tree-node .node-content) { color: #a1a1aa; border-radius: 6px; }
:deep(.file-tree-node .node-content:hover) { background: #1e1e1e; color: #d4d4d8; }
:deep(.file-tree-node .node-content.selected) { background: #1e3a5f; color: #60a5fa; }
:deep(.file-tree-node .node-content .node-icon) { color: #71717a; }
:deep(.file-tree-node .node-content.selected .node-icon) { color: #60a5fa; }

/* Element UI 弹窗主题覆盖 */
:deep(.el-dialog) { background: #18181b; border: 1px solid #3f3f46; border-radius: 12px; }
:deep(.el-dialog__header) { background: #18181b; border-bottom: 1px solid #3f3f46; padding: 16px 20px; }
:deep(.el-dialog__title) { color: #f4f4f5; font-size: 16px; font-weight: 600; }
:deep(.el-dialog__headerbtn) { top: 16px; right: 16px; }
:deep(.el-dialog__headerbtn .el-dialog__close) { color: #71717a; font-size: 20px; }
:deep(.el-dialog__headerbtn:hover .el-dialog__close) { color: #fff; }
:deep(.el-dialog__body) { background: #18181b; padding: 0; color: #d4d4d8; }
</style>
