<template>
  <el-dialog
    :visible.sync="visible"
    title="确认删除"
    width="360px"
    :close-on-click-modal="false"
    append-to-body
    @close="handleClose"
  >
    <p>确定要删除会话「{{ title }}」吗？此操作不可恢复。</p>
    <span slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="danger" @click="doDelete">删除</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'DeleteSessionDialog',
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' }
  },
  methods: {
    doDelete() {
      this.$emit('confirm')
      this.$emit('update:visible', false)
    },
    handleClose() {
      this.$emit('update:visible', false)
    }
  }
}
</script>
