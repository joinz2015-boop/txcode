<template>
  <el-dialog
    :title="editingConfig ? '编辑邮件配置' : '新增邮件配置'"
    :visible.sync="visible"
    width="500px"
    @close="handleClose"
  >
    <el-form ref="form" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="配置名称" prop="name">
        <el-input v-model="form.name" placeholder="如：工作邮箱" />
      </el-form-item>
      <el-form-item label="SMTP 服务器" prop="host">
        <el-input v-model="form.host" placeholder="smtp.example.com" />
      </el-form-item>
      <el-form-item label="端口" prop="port">
        <el-input-number v-model="form.port" :min="1" :max="65535" />
      </el-form-item>
      <el-form-item label="使用 SSL/TLS" prop="secure">
        <el-switch v-model="form.secure" />
      </el-form-item>
      <el-form-item label="用户名" prop="user">
        <el-input v-model="form.user" placeholder="邮箱地址" />
      </el-form-item>
      <el-form-item label="密码/授权码" prop="password">
        <el-input v-model="form.password" type="password" placeholder="邮箱密码或授权码" show-password />
      </el-form-item>
      <el-form-item label="发件人名称" prop="from_name">
        <el-input v-model="form.from_name" placeholder="显示的发件人名称（可选）" />
      </el-form-item>
      <el-form-item label="设为默认" prop="is_default">
        <el-switch v-model="form.is_default" />
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'EmailDialog',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    editingConfig: {
      type: Object,
      default: null
    }
  },

  data() {
    return {
      loading: false,
      form: {
        name: '',
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        from_name: '',
        is_default: false
      },
      rules: {
        name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
        host: [{ required: true, message: '请输入 SMTP 服务器地址', trigger: 'blur' }],
        user: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.initForm()
      }
    }
  },

  methods: {
    initForm() {
      if (this.editingConfig) {
        this.form = {
          name: this.editingConfig.name,
          host: this.editingConfig.host,
          port: this.editingConfig.port,
          secure: !!this.editingConfig.secure,
          user: this.editingConfig.user,
          password: this.editingConfig.password,
          from_name: this.editingConfig.from_name || '',
          is_default: !!this.editingConfig.is_default
        }
      } else {
        this.form = {
          name: '',
          host: '',
          port: 587,
          secure: false,
          user: '',
          password: '',
          from_name: '',
          is_default: false
        }
      }
    },

    handleClose() {
      this.$refs.form?.resetFields()
      this.$emit('update:visible', false)
      this.$emit('success')
    },

    async handleSubmit() {
      try {
        await this.$refs.form.validate()
        this.loading = true

        if (this.editingConfig) {
          await this.$api.updateEmailConfig(this.editingConfig.id, this.form)
          this.$message.success('更新成功')
        } else {
          await this.$api.createEmailConfig(this.form)
          this.$message.success('创建成功')
        }

        this.handleClose()
      } catch (e) {
        if (e !== false) {
          this.$message.error('保存失败: ' + e.message)
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
