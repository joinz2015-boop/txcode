<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="w-[260px] bg-sidebar border-r border-border flex flex-col shrink-0">
      <div class="flex border-b border-border text-xs uppercase font-bold text-textMuted">
        <div class="px-4 py-2 border-b-2 border-accent text-white flex items-center gap-2">
          <i class="fa-solid fa-folder-open"></i>
          Explorer
        </div>
      </div>
      
      <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button @click="goUp" :disabled="!browseResult.parent_path && browseResult.parent_path !== ''" class="p-1 text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="上级目录">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button @click="refresh" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
        <button @click="goHome" class="p-1 text-textMuted hover:text-white" title="我的电脑">
          <i class="fa-solid fa-home"></i>
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto py-1">
        <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="browseResult.items && browseResult.items.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
          此目录为空
        </div>
        <div v-else>
          <div
            v-for="item in browseResult.items"
            :key="item.path"
            @click="selectItem(item)"
            @dblclick="openItem(item)"
            class="flex items-center gap-2 px-3 py-1 cursor-pointer text-sm"
            :class="selectedPath === item.path ? 'bg-active text-white' : 'text-textMuted hover:text-white hover:bg-white/5'"
          >
            <i class="fa-solid" :class="item.is_drive ? 'fa-hdd text-blue-400' : item.is_directory ? 'fa-folder text-yellow-500' : 'fa-file text-textMuted'"></i>
            <span class="truncate">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div v-if="!selectedItem || selectedItem.is_directory" class="flex-1 flex items-center justify-center text-textMuted">
        <div class="text-center">
          <i class="fa-solid fa-folder-open text-6xl mb-4 opacity-20"></i>
          <p>选择文件查看内容</p>
        </div>
      </div>
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-sidebar">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-file text-textMuted"></i>
            <span class="text-sm text-white truncate">{{ selectedItem.name }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-textMuted">
            <span>{{ formatSize(fileContent.size) }}</span>
            <span v-if="fileContent.encoding">| {{ fileContent.encoding }}</span>
          </div>
        </div>
        <div v-if="fileContent.is_binary" class="flex-1 flex items-center justify-center text-textMuted">
          <div class="text-center">
            <i class="fa-solid fa-file-binary text-4xl mb-2 opacity-50"></i>
            <p class="text-sm">二进制文件无法预览</p>
          </div>
        </div>
        <pre v-else class="flex-1 overflow-auto p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap">{{ fileContent.content }}</pre>
      </div>
    </main>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'Files',
  data() {
    return {
      browseResult: {
        current_path: '',
        parent_path: null,
        items: []
      },
      selectedPath: '',
      selectedItem: null,
      fileContent: null,
      loading: false
    }
  },
  async created() {
    await this.browse('')
  },
  methods: {
    async browse(path) {
      this.loading = true
      try {
        const res = await api.browseFilesystem(path)
        this.browseResult = res
      } catch (e) {
        console.error('Browse failed:', e)
      } finally {
        this.loading = false
      }
    },
    selectItem(item) {
      this.selectedPath = item.path
      this.selectedItem = item
      if (!item.is_directory) {
        this.loadFileContent(item.path)
      }
    },
    openItem(item) {
      if (item.is_directory) {
        this.browse(item.path)
      }
    },
    goUp() {
      if (this.browseResult.parent_path === null) return
      this.browse(this.browseResult.parent_path === '' ? '' : this.browseResult.parent_path)
    },
    goHome() {
      this.browse('')
    },
    refresh() {
      this.browse(this.browseResult.current_path || '')
    },
    async loadFileContent(path) {
      try {
        this.fileContent = await api.getFileContent(path)
      } catch (e) {
        console.error('Load file content failed:', e)
        this.fileContent = { content: '加载失败', is_binary: false, size: 0 }
      }
    },
    formatSize(size) {
      if (!size) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      let i = 0
      while (size >= 1024 && i < units.length - 1) {
        size /= 1024
        i++
      }
      return `${size.toFixed(1)} ${units[i]}`
    }
  }
}
</script>
