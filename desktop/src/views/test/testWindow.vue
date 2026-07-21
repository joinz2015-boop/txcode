<template>
  <div class="test-window">
    <DesktopTestBrowserFrame
      ref="browserFrame"
      :initialUrl="testUrl"
      @webview-ready="onWebviewReady"
      @url-changed="onUrlChanged"
    />
    <div class="resize-handle" @mousedown="onResizeStart"></div>
    <DesktopTestChatPanel
      ref="chatPanel"
      :sessionId="testSessionId"
      :planFilePath="planFilePath"
      :planFolderName="planFolderName"
      :webContentsId="webContentsId"
      :modelName="modelName"
      :backendPort="backendPort"
      :projectPath="projectPath"
      :width="chatWidth"
      @session-created="onSessionCreated"
    />
  </div>
</template>

<script>
import DesktopTestBrowserFrame from '@/components/test/DesktopTestBrowserFrame.vue'
import DesktopTestChatPanel from '@/components/test/DesktopTestChatPanel.vue'
import { getItem, setItem } from '@/utils/storage'

export default {
  name: 'TestWindow',
  components: { DesktopTestBrowserFrame, DesktopTestChatPanel },
  data() {
    return {
      planFolderName: '',
      planFilePath: '',
      projectPath: '',
      testUrl: '',
      modelName: '',
      testSessionId: '',
      backendPort: '41000',
      webContentsId: null,
      chatWidth: getItem('test:chatWidth', 420),
    }
  },
  created() {
    const hash = window.location.hash || ''
    const queryIdx = hash.indexOf('?')
    const params = new URLSearchParams(queryIdx >= 0 ? hash.substring(queryIdx + 1) : '')
    this.planFolderName = params.get('planFolderName') || ''
    this.planFilePath = params.get('planFilePath') || ''
    this.projectPath = params.get('projectPath') || ''
    this.testUrl = params.get('testUrl') || getItem('test:testUrl', '')
    this.modelName = params.get('modelName') || ''
    this.testSessionId = params.get('sessionId') || ''
    this.backendPort = params.get('backendPort') || '41000'
  },
  methods: {
    onWebviewReady(webContentsId) {
      this.webContentsId = webContentsId
      this.registerWebview(webContentsId)
    },
    registerWebview(webContentsId) {
      if (!this.testSessionId) return
      const baseURL = `http://localhost:${this.backendPort}`
      fetch(`${baseURL}/api/test/webview/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.testSessionId, webContentsId }),
      }).catch(e => console.error('Register webview failed:', e))
    },
    onSessionCreated(sessionId) {
      this.testSessionId = sessionId
      if (this.webContentsId) {
        this.registerWebview(this.webContentsId)
      }
    },
    onUrlChanged(url) {
      this.testUrl = url
    },
    onResizeStart(e) {
      const startX = e.clientX
      const startW = this.chatWidth
      const move = (ev) => {
        this.chatWidth = Math.max(260, Math.min(600, startW + (startX - ev.clientX)))
      }
      const up = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setItem('test:chatWidth', this.chatWidth)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    saveTestUrl() {
      if (!this.testUrl) return
      setItem('test:testUrl', this.testUrl)
      window.electronAPI?.saveTestUrl(this.testUrl)
    },
  },
  beforeDestroy() {
    this.saveTestUrl()
  },
}
</script>

<style scoped>
.test-window {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary, #f5f6fa);
}

.resize-handle {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  border-radius: 2px;
}
.resize-handle:hover { background: var(--accent); opacity: 0.5; }
</style>
