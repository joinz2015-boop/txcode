<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-sidebar">
      <span class="text-xs text-textMuted mr-2">视口：</span>
      <button
        v-for="ds in deviceSizes"
        :key="ds.value"
        @click="activeDevice = ds.value"
        class="px-3 py-1 text-xs rounded border transition-colors"
        :class="activeDevice === ds.value ? 'border-accent bg-accent/10 text-white' : 'border-transparent text-textMuted hover:border-gray-500'"
        :title="ds.label"
      >
        <i :class="ds.icon" class="mr-1"></i>{{ ds.label }}
      </button>
    </div>
    <div class="flex-1 flex items-center justify-center overflow-auto bg-[#f5f5f5] p-4">
      <div v-if="!relativePath" class="text-textMuted text-center mt-20">
        <i class="fa-solid fa-eye text-6xl mb-4 opacity-20 block"></i>
        <p>双击左侧 HTML 文件预览</p>
      </div>
      <div
        v-else
        class="device-frame flex flex-col self-stretch"
        :class="`device-frame-${activeDevice}`"
        :style="frameStyle"
      >
        <div class="flex justify-end mb-2 shrink-0 gap-1">
          <button
            @click="openInNewTab"
            class="p-1 text-textMuted hover:text-white text-xs rounded hover:bg-white/10 transition-colors"
            title="新窗口打开"
          >
            <i class="fa-solid fa-up-right-from-square"></i>
          </button>
          <button
            @click="refreshPreview"
            class="p-1 text-textMuted hover:text-white text-xs rounded hover:bg-white/10 transition-colors"
            title="刷新预览"
          >
            <i class="fa-solid fa-refresh"></i>
          </button>
        </div>
        <iframe
          v-if="renderIframe"
          :src="previewSrc"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          class="w-full border-0"
          :style="iframeStyle"
          ref="previewFrame"
          @load="onIframeLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesignPreview',
  props: {
    fileContent: { type: String, default: '' },
    fileName: { type: String, default: '' },
    relativePath: { type: String, default: '' }
  },
  data() {
    return {
      activeDevice: 'web',
      refreshKey: 0,
      renderIframe: false,
      _relativePathVersion: 0,
      deviceSizes: [
        { value: 'app', label: 'App', icon: 'fa-solid fa-mobile-screen', width: 375 },
        { value: 'web', label: 'Web', icon: 'fa-solid fa-desktop', width: 0 },
        { value: 'pad', label: 'Pad', icon: 'fa-solid fa-tablet-screen-button', width: 768 }
      ]
    }
  },
  computed: {
    previewSrc() {
      if (!this.relativePath) return ''
      const src = `/design_html/${encodeURI(this.relativePath)}?_=${this._relativePathVersion}`
      console.log('[DesignPreview] previewSrc computed:', src)
      return src
    },
    iframeStyle() {
      return { width: '100%', height: '100%' }
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
        if (!val) return
        if (val.includes('_app.html')) this.activeDevice = 'app'
        else if (val.includes('_web.html')) this.activeDevice = 'web'
        else if (val.includes('_pad.html')) this.activeDevice = 'pad'
        else this.activeDevice = 'web'
        console.log('[DesignPreview] fileName changed:', val, '→ activeDevice:', this.activeDevice)
      }
    },
    relativePath(val, oldVal) {
      console.log('[DesignPreview] relativePath changed:', oldVal, '→', val)
      if (val) {
        this._relativePathVersion++
        console.log('[DesignPreview] _relativePathVersion:', this._relativePathVersion)
        this.renderIframe = false
        console.log('[DesignPreview] renderIframe set to false, scheduling recreate')
        this.$nextTick(() => {
          this.renderIframe = true
          console.log('[DesignPreview] renderIframe set to true, iframe should be created with src:', this.previewSrc)
        })
      } else {
        this.renderIframe = false
        console.log('[DesignPreview] renderIframe set to false (no file)')
      }
    }
  },
  mounted() {
    console.log('[DesignPreview] mounted, relativePath:', this.relativePath)
  },
  updated() {
    console.log('[DesignPreview] updated, relativePath:', this.relativePath, 'previewSrc:', this.previewSrc)
  },
  beforeDestroy() {
    console.log('[DesignPreview] beforeDestroy')
  },
  methods: {
    refreshPreview() {
      this.refreshKey++
      this._relativePathVersion++
      this.renderIframe = false
      this.$nextTick(() => {
        this.renderIframe = true
        console.log('[DesignPreview] refreshPreview, iframe recreated')
      })
    },
    openInNewTab() {
      if (!this.previewSrc) return
      window.open(this.previewSrc, '_blank')
    },
    onIframeLoad() {
      console.log('[DesignPreview] iframe onload, src:', this.previewSrc)
      try {
        const iframe = this.$refs.previewFrame
        if (!iframe) return
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
              if (navPath !== this.relativePath) {
                this.$emit('navigate', navPath)
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DesignPreview] onIframeLoad error:', e)
      }
    }
  }
}
</script>

<style scoped>
.device-frame {
  height: 100%;
  max-width: 100%;
}
.device-frame > iframe {
  flex: 1;
  min-height: 0;
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
</style>
