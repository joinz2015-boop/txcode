<template>
  <el-dialog
    title="Edit Memory"
    :visible.sync="dialogVisible"
    width="800px"
    class="memory-edit-dialog"
    @close="handleClose"
  >
    <div class="mb-2 text-textMuted text-sm">
      Format: memory content followed by optional description after "---", separated by §
    </div>
    <el-input
      v-model="editContent"
      type="textarea"
      :rows="15"
      class="w-full"
    />
    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" @click="handleSave">Save</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'MemoryEditDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    content: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      editContent: ''
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    }
  },
  watch: {
    content(val) {
      this.editContent = val
    }
  },
  methods: {
    handleClose() {
      this.$emit('update:visible', false)
      this.$emit('close')
    },
    handleSave() {
      this.$emit('update:visible', false)
      this.$emit('save', this.editContent)
    }
  }
}
</script>

<style scoped>
.memory-edit-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}
.memory-edit-dialog :deep(.el-textarea__inner) {
  background: #1e1e1e;
  color: #fff;
  border-color: #444;
}
</style>