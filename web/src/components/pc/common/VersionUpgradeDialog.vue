<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div class="bg-sidebar border border-border rounded p-6 w-96">
      <h3 class="text-white text-base font-bold mb-4">发现新版本</h3>
      <div class="text-sm text-gray-300 space-y-2 mb-4">
        <div>
          <span class="text-textMuted">当前版本：</span>
          <span>v{{ localVersion }}</span>
        </div>
        <div>
          <span class="text-textMuted">最新版本：</span>
          <span class="text-green-400 font-bold">v{{ latestVersion }}</span>
        </div>
        <div v-if="latestInfo">
          <span class="text-textMuted">版本类型：</span>
          <span>{{ latestInfo.version_type }}</span>
        </div>
        <div v-if="latestInfo && latestInfo.release_date">
          <span class="text-textMuted">发布日期：</span>
          <span>{{ latestInfo.release_date }}</span>
        </div>
        <div v-if="latestInfo && latestInfo.description">
          <span class="text-textMuted">更新说明：</span>
          <span>{{ latestInfo.description }}</span>
        </div>
        <div class="mt-3">
          <span class="text-textMuted">升级方式：</span>
          <div class="bg-gray-800 border border-border rounded px-3 py-2 mt-1 font-mono text-green-400 text-xs select-all">
            npm install -g tianxincode
          </div>
        </div>
      </div>
      <div class="flex justify-end">
        <button @click="$emit('close')" class="px-4 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80">知道了</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VersionUpgradeDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    localVersion: {
      type: String,
      default: ''
    },
    latestInfo: {
      type: Object,
      default: null
    }
  },
  computed: {
    latestVersion() {
      if (this.latestInfo && this.latestInfo.version) {
        return this.latestInfo.version.replace(/^v/i, '');
      }
      return '';
    }
  }
}
</script>
