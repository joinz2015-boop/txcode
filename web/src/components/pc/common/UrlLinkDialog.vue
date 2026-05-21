<template>
  <el-dialog
    title="下载链接"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="true"
    @close="handleClose"
  >
    <div class="flex gap-2">
      <el-input v-model="url" readonly class="flex-1" />
      <el-button type="primary" @click="handleCopy">复制</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'UrlLinkDialog',
  data() {
    return {
      dialogVisible: false,
      url: ''
    }
  },
  methods: {
    open(url) {
      this.url = url
      this.dialogVisible = true
    },
    handleClose() {
      this.url = ''
    },
    handleCopy() {
      navigator.clipboard.writeText(this.url)
      this.$message.success('链接已复制')
      this.dialogVisible = false
    }
  }
}
</script>