<template>
  <el-dialog
    title="文件路径"
    :visible.sync="visible"
    width="500px"
    :close-on-click-modal="true"
    @close="handleClose"
  >
    <div class="flex gap-2">
      <el-input ref="inputRef" v-model="path" readonly class="flex-1" @focus="onInputFocus" />
      <el-button type="primary" @click="handleCopy">复制</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'CopyPathDialog',
  data() {
    return {
      visible: false,
      path: ''
    }
  },
  methods: {
    open(path) {
      this.path = path
      this.visible = true
    },
    handleClose() {
      this.path = ''
    },
    onInputFocus() {
      const input = this.$refs.inputRef
      if (input) {
        const el = input.$el?.querySelector('input') || input.$el
        el?.select()
      }
    },
    handleCopy() {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(this.path).then(() => {
          this.$message.success('路径已复制')
        }).catch(() => {
          this.$message.info('请手动 Ctrl+C 复制')
        })
      } else {
        this.onInputFocus()
        this.$message.info('请手动 Ctrl+C 复制')
      }
      this.visible = false
    }
  }
}
</script>
