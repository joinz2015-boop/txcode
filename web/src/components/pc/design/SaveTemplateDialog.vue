<template>
  <el-dialog
    :visible="visible"
    title="保存为模版"
    width="420px"
    :close-on-click-modal="false"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <div class="save-template-content">
      <div class="form-item">
        <label class="form-label">模版名称</label>
        <input
          ref="nameInput"
          v-model="templateName"
          :placeholder="defaultName || '输入模版名称'"
          class="form-input"
          @keyup.enter="handleConfirm"
        />
        <p class="form-hint" v-if="currentFileName">当前页面：{{ currentFileName }}</p>
      </div>
      <div class="save-template-footer">
        <button
          class="confirm-btn"
          :disabled="!templateName.trim() || saving"
          @click="handleConfirm"
        >{{ saving ? '保存中...' : '确定' }}</button>
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { api } from '../../../api/index.js'

export default {
  name: 'SaveTemplateDialog',
  props: {
    visible: { type: Boolean, default: false },
    currentFilePath: { type: String, default: '' },
    currentFileName: { type: String, default: '' }
  },
  data() {
    return {
      templateName: '',
      saving: false
    }
  },
  computed: {
    defaultName() {
      return this.currentFileName || ''
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.templateName = this.currentFileName
          ? this.currentFileName.replace(/\.html$/i, '') + '_模版'
          : ''
        this.$nextTick(() => {
          const input = this.$refs.nameInput
          if (input) {
            input.focus()
            input.select()
          }
        })
      }
    }
  },
  methods: {
    async handleConfirm() {
      const name = this.templateName.trim()
      if (!name || this.saving) return

      this.saving = true
      try {
        let fileName = name
        if (!fileName.endsWith('.html')) {
          fileName += '.html'
        }

        const res = await api.getFileContent(this.currentFilePath)
        const content = res.data?.content || ''

        const templatePath = `.txcode/design/.template/${fileName}`
        await api.writeFile(templatePath, content)

        this.$message.success('模版保存成功')
        this.$emit('success')
        this.$emit('update:visible', false)
      } catch (e) {
        console.error('Save template failed:', e)
        this.$message.error('模版保存失败: ' + (e.message || '未知错误'))
      } finally {
        this.saving = false
      }
    },
    handleClose() {
      this.$emit('update:visible', false)
      this.$emit('close')
    },
    handleCancel() {
      this.$emit('update:visible', false)
    },
    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    }
  }
}
</script>

<style scoped>
.save-template-content { display: flex; flex-direction: column; gap: 16px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-label { color: #d4d4d8; font-size: 13px; }
.form-input {
  width: 100%; padding: 8px 12px; background: #27272a; border: 1px solid #3f3f46;
  border-radius: 4px; color: #d4d4d8; font-size: 13px; outline: none;
  box-sizing: border-box;
}
.form-input:focus { border-color: #3b82f6; }
.form-hint { color: #71717a; font-size: 12px; margin: 0; }
.save-template-footer { display: flex; justify-content: flex-end; gap: 8px; }
.cancel-btn {
  padding: 8px 16px; background: #27272a; border: 1px solid #3f3f46;
  border-radius: 4px; color: #d4d4d8; font-size: 13px; cursor: pointer;
}
.cancel-btn:hover { background: #3f3f46; }
.confirm-btn {
  padding: 8px 16px; background: #3b82f6; border: none; border-radius: 4px;
  color: white; font-size: 13px; cursor: pointer;
}
.confirm-btn:hover { background: #2563eb; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

:deep(.el-dialog) { background: #18181b; border: 1px solid #3f3f46; }
:deep(.el-dialog__header) { background: #18181b; border-bottom: 1px solid #3f3f46; padding: 16px 20px; }
:deep(.el-dialog__title) { color: #d4d4d8; font-size: 15px; font-weight: 500; }
:deep(.el-dialog__headerbtn) { top: 16px; right: 16px; }
:deep(.el-dialog__headerbtn .el-dialog__close) { color: #71717a; }
:deep(.el-dialog__headerbtn:hover .el-dialog__close) { color: #fff; }
:deep(.el-dialog__body) { background: #18181b; padding: 20px; color: #d4d4d8; }
</style>
