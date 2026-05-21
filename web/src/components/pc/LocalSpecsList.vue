<template>
  <div class="local-specs-list">
    <div class="mb-4">
      <p class="text-textMuted text-xs mb-4">
        Local specs are stored in the <code class="bg-black/30 px-1 rounded">~/.txcode/specs/</code> directory
      </p>
    </div>

    <div v-if="specs.length === 0" class="text-center text-textMuted py-8">
      <i class="fa-solid fa-folder-open text-4xl mb-4 opacity-30"></i>
      <p>No local specs</p>
      <p class="text-xs mt-2">Download from repositories or upload new specs</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="spec in specs"
        :key="spec.name"
        class="bg-sidebar border border-border p-3 rounded flex justify-between items-start hover:border-accent group"
      >
        <div class="flex gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 rounded flex items-center justify-center text-xl bg-blue-900/30 text-blue-400 shrink-0">
            <i class="fa-solid fa-file-alt"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h4 class="text-white font-bold text-sm">{{ spec.name }}</h4>
              <el-tag v-if="spec.read_mode === 'required'" type="warning" size="mini">Required</el-tag>
              <el-tag v-else type="info" size="mini">Optional</el-tag>
            </div>
            <p class="text-textMuted text-xs mt-1 line-clamp-2">{{ spec.description || 'No description' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <el-button type="text" size="small" @click="$emit('view', spec)">
            <i class="fa-solid fa-eye"></i>
          </el-button>
          <el-button type="text" size="small" class="delete-btn" @click="$emit('delete', spec.name)">
            <i class="fa-solid fa-trash"></i>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocalSpecsList',
  props: {
    specs: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.delete-btn {
  color: #f56c6c !important;
}
</style>
