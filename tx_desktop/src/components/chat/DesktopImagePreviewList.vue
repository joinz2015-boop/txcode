<template>
  <div class="image-preview-list" v-if="files && files.length > 0">
    <div v-for="file in files" :key="file.id" class="image-preview-item">
      <img :src="file.dataUrl" class="thumbnail" />
      <div v-if="file.uploading" class="upload-loading">
        <span class="loading-spinner"></span>
      </div>
      <button v-else class="remove-btn" :disabled="disabled" @click="$emit('remove', file.id)">&times;</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopImagePreviewList',
  props: {
    files: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false }
  },
  emits: ['remove']
}
</script>

<style scoped>
.image-preview-list {
  display: flex; gap: 8px; padding: 4px 0; flex-wrap: wrap;
}
.image-preview-item {
  position: relative; width: 72px; height: 72px; border: 1px solid var(--border);
  border-radius: 4px; overflow: hidden; flex-shrink: 0;
}
.thumbnail {
  width: 100%; height: 100%; object-fit: cover;
}
.upload-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.4);
}
.loading-spinner {
  width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.remove-btn {
  position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
  border: none; border-radius: 50%; background: rgba(239,68,68,0.9); color: #fff;
  font-size: 12px; line-height: 1; cursor: pointer; display: flex;
  align-items: center; justify-content: center; padding: 0;
}
.remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
