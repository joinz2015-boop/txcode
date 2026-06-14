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
      <div v-if="!fileContent" class="text-textMuted text-center mt-20">
        <i class="fa-solid fa-eye text-6xl mb-4 opacity-20 block"></i>
        <p>双击左侧 HTML 文件预览</p>
      </div>
      <div
        v-else
        class="device-frame flex flex-col"
        :class="`device-frame-${activeDevice}`"
      >
        <div class="flex justify-end mb-2 shrink-0">
          <button
            @click="refreshPreview"
            class="p-1 text-textMuted hover:text-white text-xs rounded hover:bg-white/10 transition-colors"
            title="刷新预览"
          >
            <i class="fa-solid fa-refresh"></i>
          </button>
        </div>
        <iframe
          :key="refreshKey"
          :src="previewSrc"
          sandbox="allow-scripts allow-same-origin"
          class="w-full border-0"
          :style="iframeStyle"
          ref="previewFrame"
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
      deviceSizes: [
        { value: 'app', label: 'App', icon: 'fa-solid fa-mobile-screen', width: 375, height: 812 },
        { value: 'web', label: 'Web', icon: 'fa-solid fa-desktop', width: 0, height: 0 },
        { value: 'pad', label: 'Pad', icon: 'fa-solid fa-tablet-screen-button', width: 768, height: 1024 }
      ]
    }
  },
  computed: {
    previewSrc() {
      if (!this.relativePath) return ''
      return `/api/design/html?path=${encodeURIComponent(this.relativePath)}`
    },
    iframeStyle() {
      const ds = this.deviceSizes.find(d => d.value === this.activeDevice)
      if (!ds || ds.width === 0) {
        return { width: '100%', height: '100%', minHeight: '500px' }
      }
      return { width: ds.width + 'px', height: ds.height + 'px' }
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
      }
    }
  },
  methods: {
    refreshPreview() {
      this.refreshKey++
    }
  }
}
</script>

<style scoped>
.device-frame {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.device-frame-app {
  position: relative;
  background: #1a1a1a;
  border-radius: 40px;
  padding: 16px;
  box-shadow: 0 0 0 3px #333, 0 0 0 6px #1a1a1a, 0 0 0 8px #444, 0 20px 40px rgba(0,0,0,0.5);
}
.device-frame-app::before {
  content: '';
  position: absolute;
  top: 8px;
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
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  background: #444;
  border-radius: 2px;
  z-index: 10;
}

.device-frame-web {
  background: #2d2d2d;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.device-frame-pad {
  background: #1a1a1a;
  border-radius: 24px;
  padding: 14px;
  box-shadow: 0 0 0 3px #333, 0 0 0 5px #1a1a1a, 0 20px 40px rgba(0,0,0,0.5);
}
</style>
