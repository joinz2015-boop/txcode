<template>
  <el-dialog
    :visible="visible"
    title="新建子方案"
    width="360px"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <div style="text-align: center; padding: 16px 0; font-size: 14px; color: var(--color-textMain);">
      是否新建子方案？
    </div>
    <span slot="footer">
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onConfirm">确认</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'CreateSubPlanDialog',
  props: { visible: { type: Boolean, default: false } },
  methods: {
    handleVisibleChange(val) { this.$emit('update:visible', val) },
    handleClose() { this.$emit('cancel') },
    onConfirm() { this.$emit('confirm'); this.$emit('update:visible', false) },
    onCancel() { this.$emit('cancel'); this.$emit('update:visible', false) },
  },
}
</script>

<style scoped>
:deep(.el-dialog) { background: var(--color-panelHeader); border: 1px solid var(--color-border); }
:deep(.el-dialog__header) { background: var(--color-panelHeader); border-bottom: 1px solid var(--color-border); padding: 16px 20px; }
:deep(.el-dialog__title) { color: var(--color-textMain); font-size: 15px; font-weight: 500; }
:deep(.el-dialog__headerbtn) { top: 16px; right: 16px; }
:deep(.el-dialog__headerbtn .el-dialog__close) { color: var(--color-textMuted); }
:deep(.el-dialog__headerbtn:hover .el-dialog__close) { color: var(--color-textMain); }
:deep(.el-dialog__body) { background: var(--color-panelHeader); padding: 20px; color: var(--color-textMain); }
</style>
