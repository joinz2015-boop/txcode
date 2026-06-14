<template>
  <el-dialog
    :title="editingConfig ? '编辑梓豪配置' : '新增梓豪配置'"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="配置名称" prop="name">
        <el-input v-model="form.name" placeholder="例如：我的梓豪服务器" />
      </el-form-item>
      <el-form-item label="服务地址" prop="url">
        <el-input v-model="form.url" placeholder="例如：http://192.168.1.100:5000" />
      </el-form-item>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="远程平台用户名" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" placeholder="远程平台密码" show-password />
      </el-form-item>
    </el-form>
    <span slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { zihaoApi } from '../../../api/zihao/zihaoApi.js'

export default {
  name: 'ZihaoConfigDialog',
  data() {
    return {
      dialogVisible: false,
      editingConfig: null,
      loading: false,
      form: {
        name: '',
        url: '',
        username: '',
        password: ''
      },
      rules: {
        name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
        url: [{ required: true, message: '请输入服务地址', trigger: 'blur' }],
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },
  methods: {
    open(config = null) {
      this.editingConfig = config
      if (config) {
        this.form = {
          name: config.name || '',
          url: config.url || '',
          username: config.username || '',
          password: ''
        }
      } else {
        this.form = { name: '', url: '', username: '', password: '' }
      }
      this.dialogVisible = true
    },
    handleClose() {
      this.$refs.formRef?.resetFields()
      this.dialogVisible = false
      this.editingConfig = null
    },
    async handleSubmit() {
      try {
        await this.$refs.formRef.validate()
      } catch {
        return
      }

      this.loading = true
      try {
        const data = { ...this.form }
        if (this.editingConfig?.id) {
          data.id = this.editingConfig.id
          if (!data.password) {
            delete data.password
          }
        }
        await zihaoApi.saveZihaoConfig(data)
        this.$message.success('保存成功')
        this.$emit('success')
        this.handleClose()
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
