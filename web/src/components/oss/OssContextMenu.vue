<template>
  <div
    v-show="visible"
    class="fixed bg-sidebar border border-border rounded shadow-lg py-1 z-50 min-w-[160px]"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <template v-if="target?.type === 'folder'">
      <button @click="handleRename" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
        <i class="fa-solid fa-pen text-xs"></i> 重命名
      </button>
      <button @click="handleDelete" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-active flex items-center gap-2">
        <i class="fa-solid fa-trash text-xs"></i> 删除
      </button>
    </template>
    <template v-else>
      <button @click="handleDownload" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
        <i class="fa-solid fa-download text-xs"></i> 下载
      </button>
      <button @click="handleCopyUrl" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
        <i class="fa-solid fa-link text-xs"></i> 复制下载链接
      </button>
      <div class="border-t border-border my-1"></div>
      <button @click="handleRename" class="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-active flex items-center gap-2">
        <i class="fa-solid fa-pen text-xs"></i> 重命名
      </button>
      <button @click="handleDelete" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-active flex items-center gap-2">
        <i class="fa-solid fa-trash text-xs"></i> 删除
      </button>
    </template>
  </div>
</template>

<script>
import { ossApi } from '../../api/oss/ossApi.js'

export default {
  name: 'OssContextMenu',
  data() {
    return {
      visible: false,
      x: 0,
      y: 0,
      target: null,
      onRename: null,
      onDelete: null,
      onDownload: null
    }
  },
  methods: {
    show(e, target, callbacks = {}) {
      this.target = target
      this.x = e.pageX
      this.y = e.pageY
      this.visible = true
      this.onRename = callbacks.onRename || null
      this.onDelete = callbacks.onDelete || null
      this.onDownload = callbacks.onDownload || null
    },
    hide() {
      this.visible = false
    },
    handleRename() {
      this.hide()
      if (this.onRename) {
        this.onRename(this.target)
      }
    },
    async handleDelete() {
      this.hide()
      if (this.onDelete) {
        this.onDelete(this.target)
      }
    },
    handleDownload() {
      this.hide()
      if (this.onDownload) {
        this.onDownload(this.target)
      } else if (this.target?.path) {
        ossApi.ossDownload(this.target.path)
      }
    },
    async handleCopyUrl() {
      this.hide()
      if (!this.target?.path) return
      
      try {
        const res = await ossApi.getOssDownloadUrl(this.target.path)
        navigator.clipboard.writeText(res.data.url)
        this.$message.success('下载链接已复制')
      } catch (e) {
        this.$message.error('复制失败: ' + e.message)
      }
    }
  }
}
</script>