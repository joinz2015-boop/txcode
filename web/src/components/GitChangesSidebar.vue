<template>
  <aside class="bg-sidebar border-r border-border flex flex-col shrink-0" :style="{ width: width + 'px' }">
    <div class="flex border-b border-border text-xs uppercase font-bold text-textMuted">
      <div class="px-4 py-2 border-b-2 border-accent text-white flex items-center gap-2">
        <i class="fa-brands fa-git-alt"></i>
        Git Changes
      </div>
      <button @click="$emit('refresh')" class="ml-auto px-3 py-2 hover:text-white text-textMuted" title="刷新">
        <i class="fa-solid fa-refresh"></i>
      </button>
      <button @click="$emit('revert-all')" :disabled="changes.length === 0" class="px-3 py-2 hover:text-yellow-400 text-textMuted disabled:opacity-30" title="撤销全部">
        <i class="fa-solid fa-undo-alt"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto py-1 sidebar-scroll">
      <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
      <div v-else-if="!isRepo" class="flex items-center justify-center py-8 text-textMuted text-sm">
        <div class="text-center">
          <i class="fa-brands fa-git-alt text-4xl mb-4 opacity-30"></i>
          <p>当前目录不是 Git 仓库</p>
        </div>
      </div>
      <div v-else-if="changes.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
        <div class="text-center">
          <i class="fa-solid fa-check-circle text-4xl mb-4 opacity-30 text-green-500"></i>
          <p>没有待提交的变更</p>
        </div>
      </div>
      <div v-else>
        <div
          v-for="change in changes"
          :key="change.path"
          @click="$emit('select', change)"
          class="px-3 py-2 cursor-pointer border-b border-border/50 hover:bg-[#2a2a2a] transition-colors"
          :class="selectedPath === change.path ? 'bg-[#2a2a2a] border-l-2 border-l-accent' : ''"
        >
          <div class="flex items-center gap-2">
            <span
              class="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
              :class="getStatusClass(change.status)"
            >
              {{ change.statusCode }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-gray-200 truncate" :title="change.path">
                {{ getFileName(change.path) }}
              </div>
              <div class="text-xs text-gray-500 truncate" :title="change.path">
                {{ getDirPath(change.path) }}
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0" @click.stop>
              <button @click="$emit('open-file', change)" class="p-1 text-gray-500 hover:text-blue-400 transition-colors" title="打开">
                <i class="fa-solid fa-external-link-alt text-xs"></i>
              </button>
              <button @click="$emit('revert', change)" class="p-1 text-gray-500 hover:text-yellow-400 transition-colors" title="撤销">
                <i class="fa-solid fa-undo text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-border px-3 py-2 text-xs text-textMuted">
      <span>{{ changes.length }} 个文件变更</span>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'GitChangesSidebar',
  props: {
    changes: {
      type: Array,
      default: () => []
    },
    selectedPath: {
      type: String,
      default: null
    },
    isRepo: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    width: {
      type: Number,
      default: 320
    }
  },
  methods: {
    getStatusClass(status) {
      const classes = {
        modified: 'bg-blue-600 text-white',
        added: 'bg-green-600 text-white',
        deleted: 'bg-red-600 text-white',
        untracked: 'bg-gray-600 text-white',
        renamed: 'bg-purple-600 text-white'
      }
      return classes[status] || 'bg-gray-600 text-white'
    },
    getFileName(filePath) {
      return filePath.split('/').pop() || filePath.split('\\').pop() || filePath
    },
    getDirPath(filePath) {
      const parts = filePath.split('/')
      parts.pop()
      return parts.join('/') || '.'
    }
  }
}
</script>

<style scoped>
.sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #505050;
}
</style>
