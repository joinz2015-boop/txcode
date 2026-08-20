<template>
  <div class="browser-frame" :style="{ flex: '1' }">
    <div class="browser-toolbar">
      <div class="toolbar-nav">
        <button class="nav-btn" title="后退" @click="goBack" :disabled="!canGoBack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="nav-btn" title="前进" @click="goForward" :disabled="!canGoForward">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="nav-btn" title="刷新" @click="refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.65 6.35A7.96 7.96 0 0012 4C7.58 4 4.01 7.58 4.01 12S7.58 20 12 20c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        </button>
      </div>
      <div class="url-bar">
        <span class="url-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
        </span>
        <input
          class="url-input"
          v-model="currentUrl"
          @keydown.enter="navigate"
          placeholder="输入被测系统 URL..."
        />
        <button class="go-btn" @click="navigate" title="跳转">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
    </div>
    <div class="webview-container" ref="webviewContainer">
      <webview
        v-if="showWebview"
        ref="webviewEl"
        :src="currentUrl || 'about:blank'"
        class="test-webview"
        :allowpopups="true"
        @dom-ready="onDomReady"
        @did-navigate="onNavigate"
        @did-navigate-in-page="onNavigateInPage"
      ></webview>
      <div v-if="!currentUrl" class="webview-placeholder">
        <div class="placeholder-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <p>输入被测系统 URL 并回车加载</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopTestBrowserFrame',
  props: {
    initialUrl: { type: String, default: '' },
  },
  emits: ['webview-ready', 'url-changed'],
  data() {
    return {
      currentUrl: this.initialUrl || '',
      canGoBack: false,
      canGoForward: false,
      showWebview: true,
    }
  },
  methods: {
    navigate() {
      let url = this.currentUrl.trim()
      if (!url) return
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url
        this.currentUrl = url
      }
      const wv = this.$refs.webviewEl
      if (wv) {
        wv.loadURL(url)
      } else {
        this.showWebview = true
        this.$nextTick(() => {
          const wv2 = this.$refs.webviewEl
          if (wv2) wv2.loadURL(url)
        })
      }
    },
    goBack() {
      const wv = this.$refs.webviewEl
      if (wv && wv.canGoBack()) wv.goBack()
    },
    goForward() {
      const wv = this.$refs.webviewEl
      if (wv && wv.canGoForward()) wv.goForward()
    },
    refresh() {
      const wv = this.$refs.webviewEl
      if (wv) wv.reload()
    },
    onDomReady() {
      const wv = this.$refs.webviewEl
      if (wv) {
        try {
          const wcId = wv.getWebContentsId()
          this.$emit('webview-ready', wcId)
        } catch (e) {
          console.error('getWebContentsId failed:', e)
        }
      }
    },
    onNavigate(e) {
      this.currentUrl = e.url
      this.$emit('url-changed', e.url)
    },
    onNavigateInPage(e) {
      if (e.isMainFrame) {
        this.currentUrl = e.url
        this.$emit('url-changed', e.url)
      }
    },
  },
}
</script>

<style scoped>
.browser-frame {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

.browser-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-titlebar, #f0f0f0);
  border-bottom: 1px solid var(--border, #e0e0e0);
  gap: 6px;
  flex-shrink: 0;
}

.toolbar-nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.nav-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.06);
  color: var(--text-primary, #333);
}
.nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.url-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 8px;
  padding: 0 8px;
  height: 30px;
}

.url-icon {
  color: var(--text-muted, #999);
  display: flex;
  align-items: center;
  margin-right: 6px;
  flex-shrink: 0;
}

.url-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--text-primary, #333);
  background: transparent;
  min-width: 0;
}

.go-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--accent, #4f6ef7);
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.go-btn:hover { opacity: 0.85; }

.webview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.test-webview {
  width: 100%;
  height: 100%;
  border: none;
}

.webview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #999);
  background: var(--bg-primary, #f5f6fa);
}

.placeholder-icon {
  opacity: 0.3;
  margin-bottom: 12px;
}
</style>
