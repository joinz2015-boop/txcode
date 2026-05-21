<template>
  <div>
    <div
      v-show="visible"
      class="fixed bg-[#252526] border border-[#3c3c3c] rounded shadow-lg py-1 z-50 min-w-[160px]"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <button @click="handleCopyPath" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
        <i class="fa-solid fa-copy text-xs w-4"></i> 复制路径
      </button>
      <button @click="handleRename" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
        <i class="fa-solid fa-pen text-xs w-4"></i> 重命名
      </button>
      <button @click="handleDelete" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#094771] flex items-center gap-2">
        <i class="fa-solid fa-trash text-xs w-4"></i> 删除
      </button>
      <button v-if="target?.type === 'file'" @click="handleDownload" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
        <i class="fa-solid fa-download text-xs w-4"></i> 下载到本地
      </button>
    </div>
    <CopyPathDialog ref="copyPathDialog" />
  </div>
</template>

<script>
import CopyPathDialog from '../common/CopyPathDialog.vue'

export default {
  name: 'ZihaoContextMenu',
  components: { CopyPathDialog },
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
      if (this.onRename) this.onRename(this.target)
    },
    handleDelete() {
      this.hide()
      if (this.onDelete) this.onDelete(this.target)
    },
    handleDownload() {
      this.hide()
      if (this.onDownload) this.onDownload(this.target)
    },
    handleCopyPath() {
      this.hide()
      if (this.target?.path) {
        this.$refs.copyPathDialog.open(this.target.path)
      }
    }
  }
}
</script>
