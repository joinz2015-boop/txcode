<template>
  <div class="preview-root">
    <div class="preview-toolbar">
      <span class="toolbar-label">视口：</span>
      <button
        v-for="ds in deviceSizes"
        :key="ds.value"
        @click="activeDevice = ds.value"
        class="device-btn"
        :class="{ active: activeDevice === ds.value }"
        :title="ds.label"
      >{{ ds.label }}</button>
    </div>
    <div class="preview-body">
      <div v-if="!relativePath" class="preview-empty">
        <p class="text-muted">双击左侧 HTML 文件预览</p>
      </div>
      <div
        v-else
        class="device-frame"
        :class="'device-frame-' + activeDevice"
        :style="frameStyle"
      >
        <div class="frame-actions">
          <button
            @click="$emit('save-template')"
            class="frame-btn"
            title="保存为模版"
          >保存模版</button>
          <button
            @click="openInNewTab"
            class="frame-btn"
            title="新窗口打开"
          >
            <span class="btn-icon">&#8599;</span>
          </button>
          <button
            @click="refreshPreview"
            class="frame-btn"
            title="刷新预览"
          >
            <span class="btn-icon">&#8635;</span>
          </button>
        </div>
        <iframe
          v-if="renderIframe"
          :src="previewSrc"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          class="preview-iframe"
          ref="previewFrame"
          @load="onIframeLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
import { getBaseURL } from '@/api/index'

export default {
  name: 'DesktopDesignPreview',
  props: {
    fileContent: { type: String, default: '' },
    fileName: { type: String, default: '' },
    relativePath: { type: String, default: '' },
    navSource: { type: String, default: null }
  },
  data() {
    return {
      activeDevice: 'web',
      renderIframe: false,
      relativePathVersion: 0,
      deviceSizes: [
        { value: 'app', label: 'App', width: 375 },
        { value: 'web', label: 'Web', width: 0 },
        { value: 'pad', label: 'Pad', width: 768 }
      ]
    }
  },
  computed: {
    previewSrc() {
      if (!this.relativePath) {
        this._log('previewSrc', 'computed, no relativePath', {})
        return ''
      }
      const src = getBaseURL() + '/design_html/' + encodeURI(this.relativePath) + '?_=' + this.relativePathVersion
      this._log('previewSrc', 'computed', { src, renderIframe: this.renderIframe, relativePathVersion: this.relativePathVersion })
      return src
    },
    frameStyle() {
      switch (this.activeDevice) {
        case 'app': return { width: '390px' }
        case 'pad': return { width: '800px' }
        default: return {}
      }
    }
  },
  watch: {
    fileName: {
      immediate: true,
      handler(val) {
        this._log('fileName', 'watcher triggered', { val, activeDevice: this.activeDevice })
        if (!val) return
        if (val.includes('_app.html')) this.activeDevice = 'app'
        else if (val.includes('_web.html')) this.activeDevice = 'web'
        else if (val.includes('_pad.html')) this.activeDevice = 'pad'
        else this.activeDevice = 'web'
        this._log('fileName', 'device resolved', { fileName: val, activeDevice: this.activeDevice })
      }
    },
    relativePath(val, oldVal) {
      this._log('relativePath', 'changed', { oldVal, newVal: val, navSource: this.navSource })
      if (this.navSource === 'iframe') {
        this._log('relativePath', 'suppressed by navSource=iframe', { val })
        return
      }
      if (val) {
        this._log('relativePath', 'rebuilding iframe', { val, relativePathVersion: this.relativePathVersion + 1 })
        this.relativePathVersion++
        this.renderIframe = false
        this.$nextTick(() => {
          this.renderIframe = true
          this._log('relativePath', 'iframe rebuilt', { val })
        })
      } else {
        this._log('relativePath', 'clearing, no val', { oldVal })
        this.renderIframe = false
      }
    }
  },
  mounted() {
    this._log('mounted', 'component mounted', { relativePath: this.relativePath, hasIframe: !!this.$refs.previewFrame })
    window.addEventListener('message', this._onDesignMessage)
  },
  beforeDestroy() {
    this._log('beforeDestroy', 'component destroying', { hasIframe: !!this.$refs.previewFrame })
    window.removeEventListener('message', this._onDesignMessage)
  },
  methods: {
    _log(scope, msg, extra = {}) {
      const t = (performance.now() / 1000).toFixed(3)
      console.log(`[DesktopDesignPreview][${scope}][${t}]`, msg, extra)
    },
    refreshPreview() {
      this._log('refreshPreview', 'triggered', { relativePathVersion: this.relativePathVersion })
      this.relativePathVersion++
      this.renderIframe = false
      this.$nextTick(() => {
        this.renderIframe = true
        this._log('refreshPreview', 'iframe rebuilt', { relativePathVersion: this.relativePathVersion })
      })
    },
    openInNewTab() {
      if (!this.previewSrc) return
      window.open(this.previewSrc, '_blank')
    },
    _handleIframePath(iframePath) {
      this._log('_handleIframePath', 'received', { iframePath })
      if (!iframePath || iframePath === '/') {
        this._log('_handleIframePath', 'no valid path, skip')
        return
      }
      const match = iframePath.match(/\/design_html\/(.+)$/)
      if (!match) {
        this._log('_handleIframePath', 'path does not match /design_html/ pattern', { iframePath })
        return
      }
      const navPath = decodeURIComponent(match[1])
      this._log('_handleIframePath', 'decoded navPath', { navPath })
      if (!navPath.endsWith('.html')) {
        this._log('_handleIframePath', 'not an html file, skip', { navPath })
        return
      }
      if (navPath.includes('..') || navPath.includes('~')) {
        this._log('_handleIframePath', 'path traversal attempt, blocked', { navPath })
        return
      }
      const parts = navPath.replace(/\\/g, '/').split('/')
      const fileName = parts[parts.length - 1]
      const parentDir = parts.length > 1 ? parts[parts.length - 2] : ''
      if (navPath === this.relativePath) {
        this._log('_handleIframePath', 'same page, no navigation needed', { navPath, relativePath: this.relativePath })
        return
      }
      this._log('_handleIframePath', 'detected navigation, emitting navigate', { fileName, parentDir, rawPath: navPath })
      this.$emit('navigate', { fileName: fileName, parentDir: parentDir, rawPath: navPath })
    },
    onIframeLoad() {
      this._log('onIframeLoad', 'iframe loaded', { src: this.previewSrc, relativePath: this.relativePath })
      try {
        const iframe = this.$refs.previewFrame
        if (!iframe) {
          this._log('onIframeLoad', 'no iframe ref, abort')
          return
        }
        let iframePath = null
        try {
          iframePath = iframe.contentWindow && iframe.contentWindow.location && iframe.contentWindow.location.pathname
        } catch (e) {
          this._log('onIframeLoad', 'cannot access iframe location (cross-origin?)', { error: e.message })
          return
        }
        this._log('onIframeLoad', 'got iframePath', { iframePath })
        this._handleIframePath(iframePath)
      } catch (e) {
        this._log('onIframeLoad', 'unexpected error', { error: String(e), stack: e.stack })
      }
    },
    _onDesignMessage(event) {
      if (!event.data || event.data.type !== 'txcode:design-navigate') return
      const iframePath = event.data.pathname
      if (!iframePath) return
      this._log('_onDesignMessage', 'received postMessage', { iframePath })
      this._handleIframePath(iframePath)
    }
  }
}
</script>

<style scoped>
.preview-root {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* toolbar */
.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-side);
  flex-shrink: 0;
}
.toolbar-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: 4px;
}
.device-btn {
  padding: 4px 12px;
  font-size: 11px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.15s;
  font-family: inherit;
}
.device-btn:hover {
  border-color: var(--border);
  color: var(--text-primary);
}
.device-btn.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

/* body */
.preview-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 16px;
  background: #fafafa;
  background-image: radial-gradient(circle, #e5e5ea 1px, transparent 1px);
  background-size: 20px 20px;
}
.preview-empty {
  text-align: center;
  color: var(--text-muted);
}
.text-muted {
  font-size: 13px;
  color: var(--text-muted);
}

/* device frame */
.device-frame {
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-self: stretch;
}

.device-frame-app {
  position: relative;
  background: #1a1a1a;
  border-radius: 36px;
  padding: 8px;
  box-shadow: 0 0 0 2px #333, 0 0 0 4px #1a1a1a, 0 0 0 6px #444, 0 20px 40px rgba(0,0,0,0.5);
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
  background: #2d2d2d;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.device-frame-pad {
  background: #1a1a1a;
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 0 0 2px #444, 0 0 0 4px #2a2a2a, 0 0 0 6px #555, 0 20px 40px rgba(0,0,0,0.5);
}

/* frame actions */
.frame-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  flex-shrink: 0;
  gap: 4px;
}
.frame-btn {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.15s;
  font-family: inherit;
}
.frame-btn:hover {
  color: var(--text-primary);
  background: rgba(255,255,255,0.1);
}
.btn-icon {
  font-size: 12px;
}

/* iframe */
.preview-iframe {
  width: 100%;
  flex: 1;
  min-height: 0;
  border: none;
  display: block;
}
</style>
