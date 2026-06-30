<template>
  <div class="spec-card bg-sidebar border border-border rounded-lg p-4 hover:border-accent transition-colors flex flex-col">
    <div class="flex items-start gap-3 mb-3">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
        :class="installed ? 'bg-green-900/30 text-green-400' : 'bg-purple-900/30 text-purple-400'">
        <i class="fa-solid fa-file-alt"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="text-white font-semibold text-sm truncate">{{ spec.name }}</h4>
          <el-tag v-if="installed" type="success" size="mini">已安装</el-tag>
        </div>
        <p class="text-textMuted text-xs mt-1 line-clamp-2">{{ spec.description || 'No description' }}</p>
      </div>
    </div>

    <div class="flex items-center justify-between mt-auto pt-3 border-t border-border">
      <div class="flex items-center gap-3 text-xs text-textMuted">
        <span v-if="spec.latest_version" class="flex items-center gap-1">
          <i class="fa-solid fa-code-branch"></i> {{ spec.latest_version }}
        </span>
        <span v-if="spec.download_count !== undefined" class="flex items-center gap-1">
          <i class="fa-solid fa-download"></i> {{ spec.download_count }}
        </span>
      </div>
      <div>
        <el-button
          v-if="installed"
          type="text"
          size="mini"
          @click="$emit('view', spec)"
        >查看</el-button>
        <el-button
          v-if="installed"
          type="danger"
          size="mini"
          plain
          @click="$emit('uninstall', spec)"
        >卸载</el-button>
        <el-button
          v-else
          type="primary"
          size="mini"
          :loading="installing"
          @click="$emit('install', spec)"
        >安装</el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SpecCard',
  props: {
    spec: {
      type: Object,
      required: true
    },
    installed: {
      type: Boolean,
      default: false
    },
    installing: {
      type: Boolean,
      default: false
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
.spec-card {
  min-height: 160px;
}
</style>
