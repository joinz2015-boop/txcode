<template>
  <el-dialog
    :title="editingModel ? '编辑模型' : '添加模型'"
    :visible.sync="visible"
    width="500px"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="所属服务商" v-if="!editingModel" prop="providerId">
        <el-select v-model="form.providerId" placeholder="选择服务商" style="width: 100%">
          <el-option
            v-for="p in providers"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="模型名称" prop="name">
        <el-input v-model="form.name" placeholder="例如: GPT-4" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
    </el-form>
    <span slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'ModelDialog',

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    editingModel: {
      type: Object,
      default: null,
    },
    providers: {
      type: Array,
      default: () => [],
    },
    defaultProviderId: {
      type: String,
      default: '',
    },
  },

  data() {
    return {
      form: {
        providerId: '',
        name: '',
        enabled: true,
      },
      rules: {
        providerId: [{ required: true, message: '请选择服务商', trigger: 'blur' }],
        name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
      },
    }
  },

  watch: {
    visible(val) {
      if (val) {
        if (this.editingModel) {
          this.form = {
            providerId: this.editingModel.providerId,
            name: this.editingModel.name,
            enabled: this.editingModel.enabled,
          }
        } else {
          this.form = {
            providerId: this.defaultProviderId || '',
            name: '',
            enabled: true,
          }
        }
      }
    },
  },

  methods: {
    handleClose() {
      this.$refs.formRef?.resetFields()
      this.$emit('update:visible', false)
      this.$emit('close')
    },

    async handleSubmit() {
      try {
        await this.$refs.formRef.validate()
      } catch (e) {
        return
      }

      try {
        if (this.editingModel) {
          await this.$api.updateModel(this.editingModel.id, {
            name: this.form.name,
            enabled: this.form.enabled,
          })
          this.$message.success('更新成功')
        } else {
          await this.$api.addModel(this.form)
          this.$message.success('添加成功')
        }
        this.$emit('success')
        this.handleClose()
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    },
  },
}
</script>

<style scoped>
:deep(.el-dialog) {
  background: #18181b;
  border: 1px solid #3f3f46;
}
:deep(.el-dialog__header) {
  background: #18181b;
  border-bottom: 1px solid #3f3f46;
  padding: 16px 20px;
}
:deep(.el-dialog__title) {
  color: #d4d4d8;
  font-size: 15px;
  font-weight: 500;
}
:deep(.el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}
:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #71717a;
}
:deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #fff;
}
:deep(.el-dialog__body) {
  background: #18181b;
  padding: 20px;
  color: #d4d4d8;
}
:deep(.el-dialog__footer) {
  background: #18181b;
  border-top: 1px solid #3f3f46;
  padding: 16px 20px;
}
:deep(.el-form-item__label) {
  color: #a1a1aa;
}
:deep(.el-input__inner) {
  background: #27272a;
  border-color: #3f3f46;
  color: #d4d4d8;
}
:deep(.el-input__inner:focus) {
  border-color: #3b82f6;
}
:deep(.el-select) {
  width: 100%;
}
:deep(.el-select .el-input__inner) {
  background: #27272a;
  border-color: #3f3f46;
  color: #d4d4d8;
}
</style>
