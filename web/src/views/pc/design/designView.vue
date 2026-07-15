<template>
  <div class="flex-1 flex overflow-hidden">
    <DesignSidebar
      :base-path="designBasePath"
      @open-file="openFile"
      @file-changed="refreshCurrentFile"
      @ai-status-change="onAiStatusChange"
      ref="sidebar"
    />

    <div class="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors" @mousedown="startResize"></div>

    <main class="flex-1 flex flex-col min-w-0 bg-contentBg">
      <div class="flex border-b border-border bg-sidebar">
        <div class="flex items-center">
          <div
            class="px-4 py-2 cursor-pointer border-r border-border text-sm"
            :class="rightTab === 'preview' ? 'bg-contentBg text-white border-t-2 border-t-accent' : 'text-textMuted hover:bg-hoverBg'"
            @click="rightTab = 'preview'"
          >
            <i class="fa-solid fa-eye mr-1"></i> 预览
          </div>
          <div
            class="px-4 py-2 cursor-pointer border-r border-border text-sm"
            :class="rightTab === 'editor' ? 'bg-contentBg text-white border-t-2 border-t-accent' : 'text-textMuted hover:bg-hoverBg'"
            @click="rightTab = 'editor'"
          >
            <i class="fa-solid fa-code mr-1"></i> 编辑
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <DesignPreview
          v-show="rightTab === 'preview'"
          ref="preview"
          :file-content="fileContent"
          :file-name="activeFileName"
          :relative-path="relativePath"
          :nav-source="navSource"
          @navigate="onPreviewNavigate"
          @save-template="saveAsTemplate"
        />
        <DesignEditor
          v-show="rightTab === 'editor'"
          :file-content="fileContent"
          :file-name="activeFileName"
          :file-path="activeFilePath"
          @content-changed="onContentChanged"
          @content-saved="onContentSaved"
          @refresh="refreshCurrentFile"
          ref="editor"
        />
      </div>

      <div class="h-8 bg-sidebar border-t border-border flex items-center px-3">
        <div class="flex items-center gap-4 text-xs text-textMuted">
          <span v-if="activeFilePath">{{ activeFilePath }}</span>
          <span v-else class="text-textMuted">双击左侧文件打开</span>
          <span v-if="hasChanges" class="text-yellow-500">已修改</span>
        </div>
      </div>
    </main>

    <SaveTemplateDialog
      :visible.sync="templateDialogVisible"
      :current-file-path="activeFilePath"
      :current-file-name="activeFileName"
      @success="onTemplateSaved"
    />
  </div>
</template>

<script>
import DesignSidebar from '../../../components/pc/design/DesignSidebar.vue'
import DesignPreview from '../../../components/pc/design/DesignPreview.vue'
import DesignEditor from '../../../components/pc/design/DesignEditor.vue'
import SaveTemplateDialog from '../../../components/pc/design/SaveTemplateDialog.vue'
import { api } from '../../../api/index.js'
import { eventBus } from '../../../utils/eventBus.js'
import { diagMixin } from '../../../utils/diagMixin.js'

export default {
  name: 'DesignView',
  components: { DesignSidebar, DesignPreview, DesignEditor, SaveTemplateDialog },
  mixins: [diagMixin],
  data() {
    return {
      rightTab: 'preview',
      designBasePath: '.txcode/design',
      fileContent: '',
      activeFileName: '',
      activeFilePath: '',
      relativePath: '',
      hasChanges: false,
      templateDialogVisible: false,
      isResizing: false,
      aiStatus: 'idle',
      navSource: null,
      unsubFileChanged: null
    }
  },
  mounted() {
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
    this.updateTitle()
    this.initFromRoute()
    this.unsubFileChanged = eventBus.on('file:changed', (data) => {
      this.onFileChanged(data)
    })
    this._log('lifecycle', 'mounted', {
      hasUnsubFileChanged: !!this.unsubFileChanged,
      relativePath: this.relativePath,
      rightTab: this.rightTab,
      listeners: { mousemove: true, mouseup: true, fileChanged: !!this.unsubFileChanged }
    })
  },
  watch: {
    rightTab(val, oldVal) {
      this._log('rightTab', 'changed', { oldVal, newVal: val, activeFilePath: this.activeFilePath })
      if (val === 'editor' && this.activeFilePath && !this.fileContent) {
        this._log('rightTab', 'loading file content', { activeFilePath: this.activeFilePath })
        this.loadFileContent()
      }
      if (val === 'editor') {
        this.$nextTick(() => {
          if (this.$refs.editor) this.$refs.editor.layout()
        })
      }
    },
    aiStatus() {
      this.updateTitle()
    },
    '$route.query.page': {
      handler(newVal) {
        if (this.navSource === 'sidebar' || this.navSource === 'iframe') return
        this._checkCallFrequency('routeQueryPageWatcher')
        this._log('routeQueryPage', 'watcher triggered', { newVal, relativePath: this.relativePath, willOpen: !!(newVal && newVal.endsWith('.html') && newVal !== this.relativePath) })
        if (newVal && newVal.endsWith('.html') && newVal !== this.relativePath) {
          this.openDesignPage(newVal)
        }
      }
    },
  },
  beforeDestroy() {
    this._log('lifecycle', 'beforeDestroy', {
      unsubFileChanged: !!this.unsubFileChanged,
      relativePath: this.relativePath
    })
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
    if (this.unsubFileChanged) {
      this.unsubFileChanged()
      this.unsubFileChanged = null
    }
  },
  methods: {
    updateTitle() {
      const baseTitle = this.$route.meta?.title || 'AI设计'
      let prefix = ''
      if (this.aiStatus === 'processing') prefix = '⏳ '
      else if (this.aiStatus === 'completed') prefix = '✅ '
      document.title = `${prefix}${baseTitle} - TXCode`
    },
    initFromRoute() {
      const pageParam = this.$route.query.page
      if (pageParam && pageParam.endsWith('.html')) {
        this.$nextTick(() => {
          this.openDesignPage(pageParam)
        })
      }
    },
    onPreviewNavigate(navInfo) {
      this._checkCallFrequency('onPreviewNavigate')
      this._log('onPreviewNavigate', 'called', { navInfo })
      this.syncPageFromIframe(navInfo)
    },
    async syncPageFromIframe(navInfo) {
      if (typeof navInfo === 'string') {
        const parts = navInfo.replace(/\\/g, '/').split('/')
        navInfo = {
          fileName: parts[parts.length - 1],
          parentDir: parts.length > 1 ? parts[parts.length - 2] : '',
          rawPath: navInfo
        }
      }

      const { fileName, parentDir } = navInfo
      if (!fileName || !fileName.endsWith('.html')) return

      this._checkCallFrequency('syncPageFromIframe')

      const resolved = await this.resolveDesignFile(fileName, parentDir)
      if (!resolved) {
        this._log('syncPageFromIframe', 'file not found in design dir', { fileName, parentDir })
        return
      }

      this._log('syncPageFromIframe', 'resolved', { fileName, parentDir, resolvedPath: resolved.relativePath })

      this.navSource = 'iframe'
      this.relativePath = resolved.relativePath
      this.activeFileName = resolved.relativePath.split('/').pop()
      this.activeFilePath = resolved.path
      if (this.$refs.sidebar) {
        this.$refs.sidebar.setCurrentPage(resolved.relativePath)
      }
      this._syncRouteQuery(resolved.relativePath)
      this.$nextTick(() => {
        this.navSource = null
      })
    },
    async resolveDesignFile(fileName, parentDir) {
      try {
        const treeRes = await api.getFileTree(this.designBasePath)
        const files = this._flattenTree(treeRes.data || [], this.designBasePath)
        const htmlFiles = files.filter(f => f.name.endsWith('.html'))
        const matches = htmlFiles.filter(f => f.name === fileName)

        if (matches.length === 0) return null
        if (matches.length === 1) return matches[0]

        if (parentDir) {
          const byParent = matches.filter(f => {
            const parts = f.relativePath.split('/')
            return parts.length > 1 && parts[parts.length - 2] === parentDir
          })
          if (byParent.length === 1) return byParent[0]
        }

        return matches[0]
      } catch (e) {
        console.error('resolveDesignFile failed:', e)
        return null
      }
    },
    _flattenTree(nodes, basePath) {
      const result = []
      const normalizedBase = (basePath || '').replace(/\\/g, '/')
      for (const node of nodes) {
        const normalizedPath = (node.path || '').replace(/\\/g, '/')
        let relPath = normalizedPath
        const baseIdx = normalizedPath.indexOf(normalizedBase)
        if (baseIdx !== -1) {
          relPath = normalizedPath.slice(baseIdx + normalizedBase.length).replace(/^\//, '')
        }
        result.push({ name: node.name, path: node.path, relativePath: relPath })
        if (node.children && node.children.length > 0) {
          result.push(...this._flattenTree(node.children, basePath))
        }
      }
      return result
    },
    onAiStatusChange(status) {
      this.aiStatus = status
      this.updateTitle()
    },
    openDesignPage(relativePath) {
      if (!relativePath || !relativePath.endsWith('.html')) return
      this._checkCallFrequency('openDesignPage')
      this._log('openDesignPage', 'called', { relativePath, prevRelativePath: this.relativePath, stack: new Error().stack?.split('\n').slice(1, 4).join(' → ') })
      this.navSource = 'sidebar'
      this.relativePath = relativePath
      this.activeFileName = relativePath.split('/').pop()
      this.activeFilePath = this.designBasePath + '/' + relativePath
      this.fileContent = ''
      this.hasChanges = false
      this.rightTab = 'preview'
      if (this.$refs.sidebar) {
        this.$refs.sidebar.setCurrentPage(relativePath)
      }
      this._syncRouteQuery(relativePath)
      this.$nextTick(() => {
        this.navSource = null
      })
    },
    async openFile(node) {
      console.log('[DesignView] openFile called, node:', node.name, 'path:', node.path, 'is_dir:', node.is_directory)
      if (node.is_directory) return
      this.activeFilePath = node.path
      const extracted = this.extractRelativePath(node.path)
      console.log('[DesignView] extractRelativePath result:', extracted)
      this.openDesignPage(extracted)
      console.log('[DesignView] openFile done, relativePath:', this.relativePath)
    },
    async loadFileContent() {
      if (!this.activeFilePath) return
      console.log('[DesignView] loadFileContent:', this.activeFilePath)
      try {
        const t0 = performance.now()
        const res = await api.getFileContent(this.activeFilePath)
        console.log('[DesignView] getFileContent took:', (performance.now() - t0).toFixed(1), 'ms')
        this.fileContent = res.data?.content || ''
      } catch (e) {
        console.error('[DesignView] loadFileContent failed:', e)
        this.fileContent = ''
      }
    },
    onContentChanged(changed) {
      this.hasChanges = changed
    },
    onContentSaved(content) {
      this.fileContent = content
      this.hasChanges = false
    },
    async refreshCurrentFile() {
      if (!this.activeFilePath) return
      console.log('[DesignView] refreshCurrentFile:', this.activeFilePath)
      await this.loadFileContent()
      if (this.$refs.editor && this.rightTab === 'editor') {
        this.$refs.editor.updateContent(this.fileContent)
      }
    },
    onFileChanged(data) {
      if (!data.filePath || !this.activeFilePath) return
      const normChanged = data.filePath.replace(/\\/g, '/')
      const normBase = '.txcode/design/'
      if (!normChanged.includes(normBase)) return
      if (this.$refs.preview) {
        this.$refs.preview.refreshPreview()
      }
    },
    _syncRouteQuery(relativePath) {
      if (this.$route.query.page !== relativePath) {
        this.$router.replace({ query: { page: relativePath } }).catch(() => {})
      }
    },
    saveAsTemplate() {
      if (!this.activeFilePath) {
        this.$message.warning('请先打开一个设计页面')
        return
      }
      this.templateDialogVisible = true
    },
    onTemplateSaved() {
      // 模版保存成功的回调
    },
    extractRelativePath(fullPath) {
      const markers = ['/.txcode/design/', '.txcode/design/', '\\.txcode\\design\\', '.txcode\\design\\']
      for (const marker of markers) {
        const idx = fullPath.indexOf(marker)
        if (idx !== -1) {
          return fullPath.slice(idx + marker.length).replace(/\\/g, '/')
        }
      }
      return ''
    },
    startResize(e) {
      this.isResizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    handleResize(e) {
      if (!this.isResizing) return
      const sidebar = this.$refs.sidebar
      if (!sidebar) return
      const newWidth = e.clientX
      if (newWidth >= 150 && newWidth <= 800) {
        sidebar.$el.style.width = newWidth + 'px'
      }
    },
    stopResize() {
      this.isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }
}
</script>
