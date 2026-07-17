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
          @open-file="onOpenFile"
          @current-page="onCurrentPage"
          @switch-to-ai-tab="setDesignTab('ai')"
          @file-changed="onFileChanged"
        />
      </div>

      <div class="panel-content" v-show="designTab === 'ai'">
        <DesktopDesignAiChat
          ref="aiChat"
          :currentPage="currentPage"
          @design-updated="onDesignUpdated"
          @status-change="onAiStatusChange"
        />
      </div>
    </div>

    <div class="resize-handle" @mousedown="startResize" :class="{ active: resizing }"></div>

    <div class="right-panel">
      <div class="right-tabs">
        <div class="right-tab" :class="{ active: rightTab === 'preview' }" @click="rightTab = 'preview'">
          预览
        </div>
        <div class="right-tab" :class="{ active: rightTab === 'editor' }" @click="switchToEditor">
          编辑
        </div>
      </div>

      <div class="right-content" v-show="rightTab === 'preview'">
        <div class="preview-toolbar">
          <span class="preview-toolbar-label">视口：</span>
          <button class="device-btn" :class="{ active: currentDevice === 'web' }" @click="setDevice('web')">🖥 Web</button>
          <button class="device-btn" :class="{ active: currentDevice === 'app' }" @click="setDevice('app')">📱 App</button>
          <button class="device-btn" :class="{ active: currentDevice === 'pad' }" @click="setDevice('pad')">📱 Pad</button>
          <span class="preview-toolbar-spacer"></span>
          <button class="icon-btn" title="新窗口打开" @click="openInNewWindow" v-if="activeFilePath">🔗</button>
          <button class="icon-btn" title="保存为模版" @click="openSaveTemplate" v-if="activeFilePath">💾</button>
          <button class="icon-btn" title="刷新预览" @click="refreshPreview">↻</button>
        </div>
        <div class="preview-body">
          <div class="preview-empty" v-if="!activeFilePath || !isHtmlFile">
            <div class="preview-empty-icon">👁</div>
            <p class="preview-empty-text">双击左侧 HTML 文件预览</p>
          </div>
          <div class="device-frame" :class="'device-frame-' + currentDevice" v-else>
            <div v-if="currentDevice === 'web'" class="device-browser-bar">
              <span class="browser-dot red"></span>
              <span class="browser-dot yellow"></span>
              <span class="browser-dot green"></span>
            </div>
            <div class="device-screen">
              <iframe
                v-if="renderIframe"
                class="preview-iframe"
                :src="previewSrc"
                ref="previewIframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                @load="onIframeLoad"
              ></iframe>
            </div>
            <div v-if="currentDevice === 'app'" class="device-home-bar"></div>
          </div>
        </div>
        <div class="preview-filebar">
          <span>{{ filebarPath }}</span>
        </div>
      </div>

      <div class="right-content" v-show="rightTab === 'editor'">
        <DesktopDesignEditor
          ref="editor"
          :fileContent="fileContent"
          :fileName="activeFileName"
          :filePath="activeFilePath"
          @content-saved="onEditorContentSaved"
          @refresh="refreshFileContent"
        />
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
import { getFileContent } from '@/api/index'
import DesktopDesignPageTree from '@/components/design/DesktopDesignPageTree.vue'
import DesktopDesignAiChat from '@/components/design/DesktopDesignAiChat.vue'
import DesktopDesignEditor from '@/components/design/DesktopDesignEditor.vue'
import DesktopSaveTemplateDialog from '@/components/design/DesktopSaveTemplateDialog.vue'

function getServerBaseUrl() {
  if (typeof window !== 'undefined' && window.__TXCODE_PORT__) {
    return `http://localhost:${window.__TXCODE_PORT__}`
  }
  return 'http://localhost:40000'
}

export default {
  name: 'DesktopDesignView',
  components: {
    DesktopDesignPageTree,
    DesktopDesignAiChat,
    DesktopDesignEditor,
    DesktopSaveTemplateDialog
  },
  data() {
    return {
      designTab: getItem('design:tab', 'pages'),
      leftPanelWidth: getItem('design:leftPanelWidth', 280),
      rightTab: getItem('design:rightTab', 'preview'),
      currentDevice: getItem('design:device', 'web'),
      currentPage: '',
      activeFilePath: '',
      activeFileName: '',
      fileContent: '',
      resizing: false,
      saveTemplateVisible: false,
      aiStatus: 'idle',
      relativePathVersion: 0,
      renderIframe: false,
      navSource: null
    }
  },
  computed: {
    isHtmlFile() {
      return this.activeFileName && this.activeFileName.endsWith('.html')
    },
    filebarPath() {
      if (!this.activeFilePath) return '未打开文件'
      return this.activeFilePath
    },
    previewSrc() {
      if (!this.currentPage) return ''
      return `${getServerBaseUrl()}/design_html/${encodeURI(this.currentPage)}?_=${this.relativePathVersion}`
    }
  },
  watch: {
    designTab(val) {
      setItem('design:tab', val)
      if (val === 'editor' && this.activeFilePath && this.$refs.editor) {
        this.$nextTick(() => this.$refs.editor.layout())
      }
    },
    rightTab(val) {
      setItem('design:rightTab', val)
    }
  },
  mounted() {
    const savedFile = getItem('design:currentFile', '')
    if (savedFile) {
      this.activeFilePath = savedFile
      this.activeFileName = savedFile.split(/[\\/]/).pop()
      this.currentPage = this.getRelativePath(savedFile)
      this.loadPreview()
    }
  },
  methods: {
    getRelativePath(fullPath) {
      const normalized = (fullPath || '').replace(/\\/g, '/')
      const prefix = '.txcode/design/'
      const idx = normalized.indexOf(prefix)
      if (idx !== -1) return normalized.slice(idx + prefix.length)
      return ''
    },
    setDesignTab(tab) {
      this.designTab = tab
    },

    setDevice(device) {
      this.currentDevice = device
      setItem('design:device', device)
    },

    onOpenFile({ path, name, relativePath }) {
      this.activeFilePath = path
      this.activeFileName = name
      this.currentPage = relativePath
      setItem('design:currentFile', path)
      this.navSource = 'sidebar'
      this.loadPreview()
      this.autoDetectDevice(name)
    },

    onCurrentPage(relativePath) {
      this.currentPage = relativePath
    },

    async loadPreview() {
      if (!this.activeFilePath || !this.isHtmlFile) return
      try {
        const res = await getFileContent(this.activeFilePath)
        this.fileContent = res.data?.content || ''
        this.relativePathVersion++
        this.renderIframe = false
        this.$nextTick(() => {
          this.renderIframe = true
        })
      } catch (e) {
        this.fileContent = ''
      }
    },

    refreshPreview() {
      this.relativePathVersion++
      this.renderIframe = false
      this.$nextTick(() => {
        this.renderIframe = true
      })
    },

    autoDetectDevice(fileName) {
      if (!fileName) return
      if (fileName.includes('_app.html')) this.setDevice('app')
      else if (fileName.includes('_web.html')) this.setDevice('web')
      else if (fileName.includes('_pad.html')) this.setDevice('pad')
    },

    onIframeLoad() {
      try {
        const iframe = this.$refs.previewIframe
        if (!iframe) return
        if (this.navSource === 'sidebar') {
          this.navSource = null
          return
        }
        let iframePath = null
        try {
          iframePath = iframe.contentWindow?.location?.pathname
        } catch (e) {
          return
        }
        if (iframePath && iframePath !== '/') {
          const match = iframePath.match(/\/design_html\/(.+)$/)
          if (match) {
            const navPath = decodeURIComponent(match[1])
            if (navPath.endsWith('.html') && !navPath.includes('..') && !navPath.includes('~')) {
              if (navPath !== this.currentPage) {
                this.navSource = 'iframe'
                this.currentPage = navPath
                this.activeFilePath = '.txcode/design/' + navPath
                this.activeFileName = navPath.split('/').pop()
                setItem('design:currentFile', this.activeFilePath)
                if (this.$refs.pageTree) {
                  this.$refs.pageTree.selectByPath(navPath)
                }
                getFileContent(this.activeFilePath).then(res => {
                  this.fileContent = res.data?.content || ''
                }).catch(() => {})
                this.$nextTick(() => {
                  this.navSource = null
                })
              }
            }
          }
        }
      } catch (e) {
        // cross-origin restriction, ignore
      }
    },

    switchToEditor() {
      this.rightTab = 'editor'
      if (!this.fileContent && this.activeFilePath) {
        this.loadPreview()
      }
      this.$nextTick(() => {
        if (this.$refs.editor) this.$refs.editor.layout()
      })
    },

    async refreshFileContent() {
      await this.loadPreview()
      if (this.$refs.editor) {
        this.$refs.editor.updateContent(this.fileContent)
      }
    },

    onEditorContentSaved(content) {
      this.fileContent = content
    },

    onDesignUpdated() {
      this.loadPreview()
      if (this.$refs.pageTree) {
        this.$refs.pageTree.refresh()
      }
    },

    onFileChanged() {
      if (this.activeFilePath) {
        this.loadPreview()
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

    openInNewWindow() {
      if (!this.previewSrc) return
      window.open(this.previewSrc, '_blank')
    },

    startResize(e) {
      this.resizing = true
      const startX = e.clientX
      const startW = this.leftPanelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        const w = Math.max(220, Math.min(500, startW + (ev.clientX - startX)))
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
  width: 280px; min-width: 220px; max-width: 500px;
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

.preview-toolbar {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  border-bottom: 1px solid var(--border); background: var(--bg-side); flex-shrink: 0;
}
.preview-toolbar-label { font-size: 11px; color: var(--text-muted); }
.preview-toolbar-spacer { flex: 1; }
.device-btn {
  padding: 4px 12px; font-size: 11px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent; background: transparent; color: var(--text-muted);
  transition: all 0.15s;
}
.device-btn:hover { border-color: var(--border); color: var(--text-primary); }
.device-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.icon-btn {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  font-size: 13px; display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.preview-body {
  flex: 1; display: flex; align-items: center; justify-content: center;
  overflow: auto; padding: 16px;
  background: #fafafa;
  background-image: radial-gradient(circle, #e5e5ea 1px, transparent 1px);
  background-size: 20px 20px;
}
.preview-empty { text-align: center; color: var(--text-muted); }
.preview-empty-icon { font-size: 56px; margin-bottom: 12px; opacity: 0.3; }
.preview-empty-text { font-size: 13px; }

/* Device frames */
.device-frame { display: flex; flex-direction: column; transition: all 0.2s; }
.device-frame-web {
  width: 100%; height: 100%; max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  background: #fff;
}
.device-frame-app {
  width: 390px; height: 100%; max-height: 760px;
  background: #333;
  border-radius: 32px;
  padding: 7px;
  box-shadow: 0 0 0 2px #bbb, 0 0 0 4px #f5f5f5, 0 0 0 6px #999, 0 12px 30px rgba(0,0,0,0.3);
  position: relative;
}
.device-frame-app::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 24px;
  background: #333;
  border-radius: 0 0 14px 14px;
  z-index: 10;
}
.device-frame-pad {
  width: 800px; height: 100%; max-height: 95%;
  background: #444;
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 0 0 2px #ddd, 0 0 0 4px #f5f5f5, 0 0 0 6px #bbb, 0 12px 30px rgba(0,0,0,0.25);
}

.device-browser-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; background: #e8e8e8; border-radius: 6px 6px 0 0;
  flex-shrink: 0;
}
.browser-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.browser-dot.red { background: #ff5f57; }
.browser-dot.yellow { background: #febc2e; }
.browser-dot.green { background: #28c840; }

.device-screen {
  flex: 1; overflow: hidden; background: #fff;
  border-radius: 0 0 6px 6px;
}
.device-frame-app .device-screen {
  border-radius: 28px;
  margin-top: 14px;
}
.device-frame-pad .device-screen {
  border-radius: 8px;
}
.device-frame-web .device-screen {
  border-radius: 0 0 6px 6px;
}

.device-home-bar {
  width: 80px; height: 4px; background: #666;
  border-radius: 2px; margin: 4px auto 0;
}

.preview-iframe { width: 100%; height: 100%; border: none; display: block; }

.preview-filebar {
  height: 26px; background: var(--bg-titlebar); border-top: 1px solid var(--border);
  display: flex; align-items: center; padding: 0 12px;
  font-size: 11px; color: var(--text-muted); flex-shrink: 0;
}
</style>
