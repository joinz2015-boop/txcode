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

  <url-link-dialog ref="urlLinkDialogRef" />
</template>

<script>
import { ossApi } from '../../api/oss/ossApi.js'
import UrlLinkDialog from '../common/UrlLinkDialog.vue'

export default {
  name: 'OssContextMenu',
  components: { UrlLinkDialog },
  props: {
    urlDialogRef: Object
  },
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
        const dialogRef = this.urlDialogRef || this.$refs.urlLinkDialogRef
        this.$nextTick(() => {
          dialogRef.open(res.data.url)
        })
      } catch (e) {
        this.$message.error('获取链接失败: ' + e.message)
      }
    }
  }
}
</script>