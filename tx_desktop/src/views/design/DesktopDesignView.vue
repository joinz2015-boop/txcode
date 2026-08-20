<template>
  <div class="design-view">
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <div class="panel-tabs">
        <div class="panel-tab" :class="{ active: designTab === 'pages' }" @click="setDesignTab('pages')">
          <span>📄</span> 设计页面
        </div>
        <div class="panel-tab" :class="{ active: designTab === 'ai' }" @click="setDesignTab('ai')">
          <span>🤖</span> AI设计助手
        </div>
      </div>

      <div class="panel-content" v-show="designTab === 'pages'">
        <DesktopDesignPageTree
          ref="pageTree"
          @open-file="openFile"
          @current-page="onCurrentPage"
          @switch-to-ai-tab="setDesignTab('ai')"
          @file-changed="onFileChanged"
        />
      </div>

      <keep-alive>
        <DesktopDesignAiChat
          v-if="designTab === 'ai'"
          ref="aiChat"
          :currentPage="relativePath"
          @design-updated="onDesignUpdated"
          @status-change="onAiStatusChange"
        />
      </keep-alive>
    </div>

    <div class="resize-handle" @mousedown="startResize" :class="{ active: resizing }"></div>

    <div class="right-panel">
      <div class="right-tabs">
        <div class="right-tab" :class="{ active: rightTab === 'preview' }" @click="rightTab = 'preview'">
          预览
        </div>
        <div class="right-tab" :class="{ active: rightTab === 'editor' }" @click="rightTab = 'editor'">
          编辑
        </div>
      </div>

      <div class="right-content">
        <DesktopDesignPreview
          v-show="rightTab === 'preview'"
          ref="preview"
          :file-content="fileContent"
          :file-name="activeFileName"
          :relative-path="relativePath"
          :nav-source="navSource"
          @navigate="onPreviewNavigate"
          @save-template="openSaveTemplate"
        />
        <DesktopDesignEditor
          v-show="rightTab === 'editor'"
          ref="editor"
          :fileContent="fileContent"
          :fileName="activeFileName"
          :filePath="activeFilePath"
          @content-saved="onEditorContentSaved"
          @refresh="refreshCurrentFile"
        />
      </div>

      <div class="preview-filebar">
        <span>{{ activeFilePath || '双击左侧文件打开' }}</span>
      </div>
    </div>

    <DesktopSaveTemplateDialog
      :visible.sync="saveTemplateVisible"
      :filePath="activeFilePath"
      :fileName="activeFileName"
      @success="onTemplateSaved"
    />
  </div>
</template>

<script>
import { getItem, setItem } from '@/utils/storage'
import { getFileContent, getFileTree } from '@/api/index'
import DesktopDesignPageTree from '@/components/design/DesktopDesignPageTree.vue'
import DesktopDesignAiChat from '@/components/design/DesktopDesignAiChat.vue'
import DesktopDesignEditor from '@/components/design/DesktopDesignEditor.vue'
import DesktopDesignPreview from '@/components/design/DesktopDesignPreview.vue'
import DesktopSaveTemplateDialog from '@/components/design/DesktopSaveTemplateDialog.vue'
import { eventBus } from '@/utils/eventBus'

export default {
  name: 'DesktopDesignView',
  components: {
    DesktopDesignPageTree,
    DesktopDesignAiChat,
    DesktopDesignEditor,
    DesktopDesignPreview,
    DesktopSaveTemplateDialog
  },
  data() {
    return {
      designTab: getItem('design:tab', 'pages'),
      leftPanelWidth: getItem('design:leftPanelWidth', 420),
      rightTab: getItem('design:rightTab', 'preview'),
      relativePath: '',
      activeFilePath: '',
      activeFileName: '',
      fileContent: '',
      resizing: false,
      saveTemplateVisible: false,
      aiStatus: 'idle',
      navSource: null,
      designBasePath: '.txcode/design'
    }
  },
  computed: {
    isHtmlFile() {
      return this.activeFileName && this.activeFileName.endsWith('.html')
    }
  },
  watch: {
    designTab(val) {
      setItem('design:tab', val)
    },
    rightTab(val) {
      setItem('design:rightTab', val)
      if (val === 'editor' && this.activeFilePath && !this.fileContent) {
        this.loadFileContent()
      }
      if (val === 'editor') {
        this.$nextTick(() => {
          if (this.$refs.editor) this.$refs.editor.layout()
        })
      }
    }
  },
  mounted() {
    const savedFile = getItem('design:currentFile', '')
    if (savedFile) {
      this.activeFilePath = savedFile
      this.activeFileName = savedFile.split(/[\\/]/).pop()
      this.relativePath = this.extractRelativePath(savedFile)
    }
    this._unsubFileChanged = eventBus.on('file:changed', (data) => {
      this.onFileChanged(data)
    })
  },
  beforeDestroy() {
    if (this._unsubFileChanged) {
      this._unsubFileChanged()
    }
  },
  methods: {
    _log(scope, msg, extra = {}) {
      const t = (performance.now() / 1000).toFixed(3)
      console.log(`[DesktopDesignView][${scope}][${t}]`, msg, extra)
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

    setDesignTab(tab) {
      this.designTab = tab
    },

    async openFile(node) {
      this._log('openFile', 'opening file', { nodePath: node.path, isDirectory: node.is_directory })
      if (node.is_directory) return
      this.activeFilePath = node.path
      const extracted = this.extractRelativePath(node.path)
      this._log('openFile', 'extracted relativePath', { fullPath: node.path, extracted })
      this.openDesignPage(extracted)
    },

    openDesignPage(relativePath) {
      this._log('openDesignPage', 'opening design page', { relativePath, navSource: 'sidebar' })
      if (!relativePath || !relativePath.endsWith('.html')) {
        this._log('openDesignPage', 'invalid path, skip', { relativePath })
        return
      }
      this.navSource = 'sidebar'
      this.relativePath = relativePath
      this.activeFileName = relativePath.split('/').pop()
      this.activeFilePath = this.designBasePath + '/' + relativePath
      this.fileContent = ''
      this.rightTab = 'preview'
      setItem('design:currentFile', this.activeFilePath)
      this._log('openDesignPage', 'page opened', { relativePath, activeFilePath: this.activeFilePath, activeFileName: this.activeFileName })
      this.$nextTick(() => {
        this.navSource = null
      })
    },

    onCurrentPage(relativePath) {
      this.relativePath = relativePath
    },

    onPreviewNavigate(navInfo) {
      this._log('onPreviewNavigate', 'received navigate event', { navInfo })
      this.syncPageFromIframe(navInfo)
    },

    async syncPageFromIframe(navInfo) {
      this._log('syncPageFromIframe', 'start', { navInfo, type: typeof navInfo })
      if (typeof navInfo === 'string') {
        const parts = navInfo.replace(/\\/g, '/').split('/')
        navInfo = {
          fileName: parts[parts.length - 1],
          parentDir: parts.length > 1 ? parts[parts.length - 2] : '',
          rawPath: navInfo
        }
        this._log('syncPageFromIframe', 'parsed string navInfo', { navInfo })
      }

      const { fileName, parentDir } = navInfo
      if (!fileName || !fileName.endsWith('.html')) {
        this._log('syncPageFromIframe', 'invalid fileName, skip', { fileName })
        return
      }

      const resolved = await this.resolveDesignFile(fileName, parentDir)
      this._log('syncPageFromIframe', 'resolved', { resolved: resolved ? { relativePath: resolved.relativePath, path: resolved.path } : null })
      if (!resolved) {
        this._log('syncPageFromIframe', 'resolve failed, skip')
        return
      }

      this.navSource = 'iframe'
      this.relativePath = resolved.relativePath
      this.activeFileName = resolved.relativePath.split('/').pop()
      this.activeFilePath = resolved.path
      setItem('design:currentFile', this.activeFilePath)
      this._log('syncPageFromIframe', 'updated activeFilePath', { activeFilePath: this.activeFilePath, relativePath: resolved.relativePath })
      this.$nextTick(() => {
        this.navSource = null
      })
    },

    async resolveDesignFile(fileName, parentDir) {
      this._log('resolveDesignFile', 'searching', { fileName, parentDir, basePath: this.designBasePath })
      try {
        const treeRes = await getFileTree(this.designBasePath)
        const files = this._flattenTree(treeRes.data || [], this.designBasePath)
        const htmlFiles = files.filter(f => f.name.endsWith('.html'))
        const matches = htmlFiles.filter(f => f.name === fileName)
        this._log('resolveDesignFile', 'search result', { fileName, htmlFilesCount: htmlFiles.length, matchesCount: matches.length })

        if (matches.length === 0) {
          this._log('resolveDesignFile', 'no matches', { fileName })
          return null
        }
        if (matches.length === 1) {
          this._log('resolveDesignFile', 'single match resolved', { resolved: matches[0].relativePath })
          return matches[0]
        }

        if (parentDir) {
          const byParent = matches.filter(f => {
            const parts = f.relativePath.split('/')
            return parts.length > 1 && parts[parts.length - 2] === parentDir
          })
          if (byParent.length === 1) {
            this._log('resolveDesignFile', 'resolved by parentDir', { resolved: byParent[0].relativePath, parentDir })
            return byParent[0]
          }
          this._log('resolveDesignFile', 'multiple matches with parentDir, using first', { parentDir, matchesCount: matches.length })
        }

        this._log('resolveDesignFile', 'using first match (fallback)', { resolved: matches[0].relativePath })
        return matches[0]
      } catch (e) {
        this._log('resolveDesignFile', 'error', { error: String(e), stack: e.stack })
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

    async loadFileContent() {
      if (!this.activeFilePath) return
      try {
        const res = await getFileContent(this.activeFilePath)
        this.fileContent = res.data?.content || ''
      } catch (e) {
        this.fileContent = ''
      }
    },

    onEditorContentSaved(content) {
      this.fileContent = content
    },

    async refreshCurrentFile() {
      if (!this.activeFilePath) return
      await this.loadFileContent()
      if (this.$refs.editor && this.rightTab === 'editor') {
        this.$refs.editor.updateContent(this.fileContent)
      }
    },

    onDesignUpdated() {
      if (this.$refs.pageTree) {
        this.$refs.pageTree.refresh()
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
      if (this.$refs.pageTree) {
        this.$refs.pageTree.refresh()
      }
    },

    onAiStatusChange(status) {
      this.aiStatus = status
    },

    openSaveTemplate() {
      this.saveTemplateVisible = true
    },

    onTemplateSaved() {
      // template saved successfully
    },

    startResize(e) {
      this.resizing = true
      const startX = e.clientX
      const startW = this.leftPanelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        const w = Math.max(220, Math.min(800, startW + (ev.clientX - startX)))
        this.leftPanelWidth = w
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setItem('design:leftPanelWidth', this.leftPanelWidth)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    }
  }
}
</script>

<style scoped>
.design-view { flex: 1; display: flex; overflow: hidden; }

.left-panel {
  width: 420px; min-width: 220px; max-width: 800px;
  background: var(--bg-side); display: flex; flex-direction: column;
  border-right: 1px solid var(--border); overflow: hidden;
}
.panel-tabs { display: flex; border-bottom: 1px solid var(--border); background: var(--bg-titlebar); flex-shrink: 0; }
.panel-tab {
  flex: 1; text-align: center; padding: 10px 8px; cursor: pointer;
  font-size: 12.5px; border-bottom: 2px solid transparent;
  transition: all 0.15s; color: var(--text-muted); user-select: none;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.panel-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.panel-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.panel-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.resize-handle { width: 3px; min-width: 3px; background: var(--border); cursor: col-resize; transition: background 0.15s; flex-shrink: 0; }
.resize-handle:hover, .resize-handle.active { background: var(--accent); }

.right-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-panel); min-width: 300px; }

.right-tabs {
  display: flex; border-bottom: 1px solid var(--border); background: var(--bg-side); flex-shrink: 0;
}
.right-tab {
  padding: 8px 16px; cursor: pointer; font-size: 12.5px;
  border-bottom: 2px solid transparent; color: var(--text-muted);
  transition: all 0.15s; user-select: none;
}
.right-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.right-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

.right-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.preview-filebar {
  height: 26px; background: var(--bg-titlebar); border-top: 1px solid var(--border);
  display: flex; align-items: center; padding: 0 12px;
  font-size: 11px; color: var(--text-muted); flex-shrink: 0;
}
</style>
