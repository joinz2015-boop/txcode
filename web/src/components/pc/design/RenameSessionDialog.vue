<template>
  <el-dialog
    :visible.sync="visible"
    title="重命名会话"
    width="400px"
    :close-on-click-modal="false"
    append-to-body
    @close="handleClose"
  >
    <el-input v-model="inputValue" placeholder="请输入新名称" @keydown.enter.native="doRename"></el-input>
    <span slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="doRename" :disabled="!inputValue.trim()">确定</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'RenameSessionDialog',
  props: {
    visible: { type: Boolean, default: false },
    value: { type: String, default: '' }
  },
  data() {
    return {
      inputValue: ''
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.inputValue = this.value || ''
      }
    }
  },
  methods: {
    doRename() {
      const trimmed = this.inputValue.trim()
      if (!trimmed) return
      this.$emit('confirm', trimmed)
      this.$emit('update:visible', false)
    },
    handleClose() {
      this.$emit('update:visible', false)
    }
  }
}
</script>
