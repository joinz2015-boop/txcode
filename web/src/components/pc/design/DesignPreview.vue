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
    <div class="flex-1 flex items-start justify-center overflow-auto bg-[#f5f5f5] p-4">
      <div v-if="!fileContent" class="text-textMuted text-center mt-20">
        <i class="fa-solid fa-eye text-6xl mb-4 opacity-20 block"></i>
        <p>双击左侧 HTML 文件预览</p>
      </div>
      <div
        v-else
        class="bg-white shadow-lg transition-all overflow-hidden"
        :style="previewStyle"
      >
        <iframe
          :srcdoc="fileContent"
          sandbox="allow-scripts allow-same-origin"
          class="w-full h-full border-0"
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
    fileName: { type: String, default: '' }
  },
  data() {
    return {
      activeDevice: 'web',
      deviceSizes: [
        { value: 'app', label: 'App', icon: 'fa-solid fa-mobile-screen', width: 375 },
        { value: 'web', label: 'Web', icon: 'fa-solid fa-desktop', width: 0 },
        { value: 'pad', label: 'Pad', icon: 'fa-solid fa-tablet-screen-button', width: 768 }
      ]
    }
  },
  computed: {
    previewStyle() {
      const ds = this.deviceSizes.find(d => d.value === this.activeDevice)
      if (!ds || ds.width === 0) return { width: '100%', height: '100%' }
      return { width: ds.width + 'px', height: '100%', minHeight: '600px' }
    }
  }
}
</script>
