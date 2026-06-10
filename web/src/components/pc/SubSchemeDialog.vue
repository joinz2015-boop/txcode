<template>
  <el-dialog
    :visible="visible"
    title="新建子方案"
    width="420px"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <el-form label-width="80px">
      <el-form-item label="方案名称">
        <el-input v-model="name" placeholder="请输入子方案名称" @keyup.enter.native="onConfirm" />
      </el-form-item>
      <el-form-item label="所属大类">
        <span>{{ category }}</span>
      </el-form-item>
      <el-form-item label="父方案">
        <span>{{ parentName }}</span>
      </el-form-item>
    </el-form>
    <span slot="footer">
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onConfirm" :disabled="!name.trim()">确认</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'SubSchemeDialog',
  props: {
    visible: { type: Boolean, default: false },
    category: { type: String, default: '' },
    parentName: { type: String, default: '' },
    defaultName: { type: String, default: '' }
  },
  data() {
    return {
      name: ''
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.name = this.defaultName
      }
    }
  },
  methods: {
    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    },
    handleClose() {
      this.$emit('cancel')
    },
    onConfirm() {
      const trimmed = this.name.trim()
      if (!trimmed) return
      this.$emit('confirm', trimmed)
      this.$emit('update:visible', false)
    },
    onCancel() {
      this.$emit('cancel')
      this.$emit('update:visible', false)
    }
  }
}
</script>
