<template>
  <div class="file-view">
    <div class="file-main">
      <aside class="file-sidebar" :style="{ width: state.sidebarWidth + 'px' }">
        <DesktopFileTree ref="tree" @contextmenu="onTreeContextMenu" />
      </aside>

      <div class="file-resizer" :class="{ dragging: resizing }" @mousedown="startResize"></div>

      <main class="file-editor-area">
        <DesktopFileTabs />
        <DesktopFileEditor ref="editor" />
      </main>
    </div>

    <div class="file-statusbar">
      <div class="fs-left">
        <span class="fs-item">
          <span class="status-dot"></span>
          txcode
        </span>
        <span class="fs-item">已打开 <span class="fs-count">{{ state.tabs.length }}</span> 个文件</span>
      </div>
      <div class="fs-right">
        <span class="fs-item">项目: {{ projectName }}</span>
        <span class="fs-item">v{{ appVersion }}</span>
      </div>
    </div>

    <DesktopFileContextMenu
      :visible="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :node="ctxMenu.node"
      @close="closeCtxMenu"
      @new-file="ctxNew('file')"
      @new-folder="ctxNew('dir')"
      @collapse-all="ctxCollapse"
      @copy-link="ctxCopyLink"
      @rename="ctxRename"
      @delete="ctxDelete"
    />

    <DesktopCopyLinkDialog
      :visible="copyVisible"
      :link="copyLink"
      @close="copyVisible = false"
      @toast="pushToast"
    />

    <div class="file-toasts">
      <div v-for="t in toasts" :key="t.id" class="file-toast" :class="t.type">{{ t.msg }}</div>
    </div>
  </div>
</template>

<script>
import { createFileManager } from '@/components/file/useFileManager'
import DesktopFileTree from '@/components/file/DesktopFileTree.vue'
import DesktopFileTabs from '@/components/file/DesktopFileTabs.vue'
import DesktopFileEditor from '@/components/file/DesktopFileEditor.vue'
import DesktopFileContextMenu from '@/components/file/DesktopFileContextMenu.vue'
import DesktopCopyLinkDialog from '@/components/file/DesktopCopyLinkDialog.vue'
import { eventBus } from '@/utils/eventBus'

export default {
  name: 'DesktopFileView',
  components: {
    DesktopFileTree,
    DesktopFileTabs,
    DesktopFileEditor,
    DesktopFileContextMenu,
    DesktopCopyLinkDialog
  },
  inject: ['desktopState'],
  provide() {
    return {
      fileManager: this.fileManager
    }
  },
  data() {
    return {
      fileManager: createFileManager(),
      resizing: false,
      ctxMenu: { visible: false, x: 0, y: 0, node: null },
      copyVisible: false,
      copyLink: null,
      toasts: [],
      toastId: 0
    }
  },
  computed: {
    state() {
      return this.fileManager.state
    },
    projectName() {
      const p = this.desktopState && this.desktopState.currentProject
      return (p && p.name) || 'txcode'
    },
    appVersion() {
      return (this.desktopState && this.desktopState.appVersion) || '1.0.56'
    }
  },
  mounted() {
    this._unsubToast = eventBus.on('file:toast', (d) => {
      this.pushToast(d)
    })
    this._onKeydown = (e) => this.onKeydown(e)
    document.addEventListener('keydown', this._onKeydown)
    this.loadTree()
  },
  beforeDestroy() {
    if (this._unsubToast) {
      this._unsubToast()
      this._unsubToast = null
    }
    if (this._onKeydown) {
      document.removeEventListener('keydown', this._onKeydown)
      this._onKeydown = null
    }
  },
  methods: {
    async loadTree() {
      const p = this.desktopState && this.desktopState.currentProject
      await this.fileManager.loadTree(p ? p.path : '', p ? p.name : '')
    },

    onTreeContextMenu({ event, node }) {
      this.ctxMenu = { visible: true, x: event.clientX, y: event.clientY, node }
    },
    closeCtxMenu() {
      this.ctxMenu.visible = false
    },
    ctxNew(mode) {
      const node = this.ctxMenu.node
      this.closeCtxMenu()
      if (!node) return
      const parent = node.type === 'dir' ? node : this.fileManager.findParent(node)
      this.fileManager.startCreate(mode, parent || this.fileManager.state.root)
    },
    ctxCollapse() {
      const node = this.ctxMenu.node
      this.closeCtxMenu()
      if (node && node.type === 'dir') this.fileManager.collapseNode(node)
    },
    async ctxCopyLink() {
      const node = this.ctxMenu.node
      this.closeCtxMenu()
      if (!node) return
      this.copyLink = await this.fileManager.buildCopyLink(node)
      this.copyVisible = true
    },
    ctxRename() {
      const node = this.ctxMenu.node
      this.closeCtxMenu()
      if (node) this.fileManager.startRename(node)
    },
    ctxDelete() {
      const node = this.ctxMenu.node
      this.closeCtxMenu()
      if (node) this.fileManager.deleteNode(node)
    },

    startResize(e) {
      this.resizing = true
      const startX = e.clientX
      const startW = this.state.sidebarWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        const w = Math.max(200, Math.min(460, startW + (ev.clientX - startX)))
        this.fileManager.setSidebarWidth(w)
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },

    onKeydown(e) {
      if (this.$route.name !== 'files') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const t = e.target
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
        if (t && t.closest && t.closest('.monaco-editor')) return
        e.preventDefault()
        if (this.$refs.tree) this.$refs.tree.focusSearch()
      }
    },

    pushToast({ msg, type }) {
      const id = ++this.toastId
      this.toasts.push({ id, msg: msg || '', type: type === 'err' ? 'err' : 'ok' })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, 2400)
    }
  }
}
</script>

<style scoped>
.file-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-window);
}
.file-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.file-sidebar {
  min-width: 200px;
  max-width: 460px;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}
.file-resizer {
  width: 3px;
  cursor: col-resize;
  flex-shrink: 0;
  background: transparent;
  transition: background 0.15s;
}
.file-resizer:hover,
.file-resizer.dragging {
  background: var(--accent);
  opacity: 0.5;
}
.file-editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-code);
  overflow: hidden;
  min-width: 0;
}
.file-statusbar {
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
  flex-shrink: 0;
}
.fs-left,
.fs-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.fs-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: color 0.15s;
}
.fs-item:hover {
  color: var(--text-primary);
}
.fs-count {
  font-weight: 600;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}
.file-toasts {
  position: fixed;
  bottom: 48px;
  right: 20px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}
.file-toast {
  background: #1f2430;
  color: #fff;
  font-size: 12.5px;
  padding: 8px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 8px;
  animation: toastIn 0.2s ease;
  max-width: 360px;
}
.file-toast.ok::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  flex-shrink: 0;
}
.file-toast.err::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
