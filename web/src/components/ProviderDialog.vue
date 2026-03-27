<template>
  <el-dialog
    :title="editingProvider ? '编辑服务商' : '添加服务商'"
    :visible.sync="visible"
    width="500px"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="预设模板" v-if="!editingProvider">
        <el-select v-model="selectedPreset" placeholder="选择预设或自定义" style="width: 100%" @change="onPresetChange">
          <el-option v-for="p in presets" :key="p.name" :label="p.label" :value="p.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="例如: OpenAI" />
      </el-form-item>
      <el-form-item label="API Key" prop="apiKey">
        <el-input v-model="form.apiKey" :placeholder="editingProvider ? '留空则不修改' : 'sk-...'" />
        <div v-if="editingProvider && originalApiKey" class="form-tip">当前已设置 API Key</div>
      </el-form-item>
      <el-form-item label="Base URL" prop="baseUrl">
        <el-input v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
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
  name: 'ProviderDialog',

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    editingProvider: {
      type: Object,
      default: null,
    },
  },

  data() {
    return {
      selectedPreset: '',
      originalApiKey: '',
      presets: [
        { name: 'openai', label: 'OpenAI', nameValue: 'OpenAI', baseUrlValue: 'https://api.openai.com/v1' },
        { name: 'deepseek', label: 'DeepSeek', nameValue: 'DeepSeek', baseUrlValue: 'https://api.deepseek.com/v1' },
        { name: 'openrouter', label: 'OpenRouter', nameValue: 'OpenRouter', baseUrlValue: 'https://openrouter.ai/api/v1' },
        { name: 'custom', label: '自定义', nameValue: '', baseUrlValue: '' },
      ],
      form: {
        name: '',
        apiKey: '',
        baseUrl: '',
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
      },
    }
  },

  watch: {
    visible(val) {
      if (val && this.editingProvider) {
        this.loadProviderDetail()
      } else if (val) {
        this.selectedPreset = ''
        this.originalApiKey = ''
        this.form = {
          name: '',
          apiKey: '',
          baseUrl: '',
        }
      }
    },
  },

  methods: {
    async loadProviderDetail() {
      try {
        const res = await this.$api.getProvider(this.editingProvider.id)
        this.originalApiKey = res.data?.apiKey || ''
        this.form = {
          name: this.editingProvider.name,
          apiKey: this.originalApiKey,
          baseUrl: this.editingProvider.baseUrl || '',
        }
      } catch (e) {
        this.form = {
          name: this.editingProvider.name,
          apiKey: '',
          baseUrl: this.editingProvider.baseUrl || '',
        }
      }
    },

    onPresetChange(presetName) {
      const preset = this.presets.find(p => p.name === presetName)
      if (preset) {
        this.form.name = preset.nameValue
        this.form.baseUrl = preset.baseUrlValue
      }
    },

    handleClose() {
      this.$refs.formRef?.resetFields()
      this.selectedPreset = ''
      this.originalApiKey = ''
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
        if (this.editingProvider) {
          const updateData = {
            name: this.form.name,
            baseUrl: this.form.baseUrl,
          }
          if (this.form.apiKey && this.form.apiKey !== this.originalApiKey) {
            updateData.apiKey = this.form.apiKey
          }
          await this.$api.updateProvider(this.editingProvider.id, updateData)
          this.$message.success('更新成功')
        } else {
          await this.$api.addProvider(this.form)
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
.form-tip {
  font-size: 12px;
  color: #67c23a;
  margin-top: 4px;
}
</style>
