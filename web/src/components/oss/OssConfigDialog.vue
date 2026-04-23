<template>
  <el-dialog
    :title="config ? '编辑OSS配置' : '新增OSS配置'"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="配置名称" prop="name">
        <el-input v-model="form.name" placeholder="例如：我的OSS" />
      </el-form-item>
      <el-form-item label="Endpoint" prop="endpoint">
        <el-input v-model="form.endpoint" placeholder="例如：oss-cn-hangzhou.aliyuncs.com" />
      </el-form-item>
      <el-form-item label="Bucket" prop="bucket">
        <el-input v-model="form.bucket" placeholder="Bucket名称" />
      </el-form-item>
      <el-form-item label="Region" prop="region">
        <el-select v-model="form.region" placeholder="选择区域" style="width: 100%">
          <el-option label="华东-杭州 (cn-hangzhou)" value="oss-cn-hangzhou" />
          <el-option label="华东-上海 (cn-shanghai)" value="oss-cn-shanghai" />
          <el-option label="华北-北京 (cn-beijing)" value="oss-cn-beijing" />
          <el-option label="华南-深圳 (cn-shenzhen)" value="oss-cn-shenzhen" />
          <el-option label="香港 (cn-hongkong)" value="oss-cn-hongkong" />
          <el-option label="美西-硅谷 (us-west-1)" value="us-west-1" />
          <el-option label="美东-弗吉尼亚 (us-east-1)" value="us-east-1" />
        </el-select>
      </el-form-item>
      <el-form-item label="AccessKey ID" prop="access_key_id">
        <el-input v-model="form.access_key_id" placeholder="AccessKey ID" />
      </el-form-item>
      <el-form-item label="AccessKey Secret" prop="access_key_secret">
        <el-input v-model="form.access_key_secret" placeholder="AccessKey Secret" show-password />
      </el-form-item>
    </el-form>
    <span slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { ossApi } from '../../api/oss/ossApi.js'

export default {
  name: 'OssConfigDialog',
  data() {
    return {
      dialogVisible: false,
      config: null,
      loading: false,
      form: {
        name: '',
        endpoint: '',
        bucket: '',
        region: 'oss-cn-hangzhou',
        access_key_id: '',
        access_key_secret: ''
      },
      rules: {
        name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
        endpoint: [{ required: true, message: '请输入Endpoint', trigger: 'blur' }],
        bucket: [{ required: true, message: '请输入Bucket名称', trigger: 'blur' }],
        access_key_id: [{ required: true, message: '请输入AccessKey ID', trigger: 'blur' }],
        access_key_secret: [{ required: true, message: '请输入AccessKey Secret', trigger: 'blur' }]
      }
    }
  },
  methods: {
    open(config = null) {
      this.config = config
      if (config) {
        this.form = {
          name: config.name || '',
          endpoint: config.endpoint || '',
          bucket: config.bucket || '',
          region: config.region || 'oss-cn-hangzhou',
          access_key_id: config.access_key_id || '',
          access_key_secret: ''
        }
      } else {
        this.form = {
          name: '',
          endpoint: '',
          bucket: '',
          region: 'oss-cn-hangzhou',
          access_key_id: '',
          access_key_secret: ''
        }
      }
      this.dialogVisible = true
    },
    handleClose() {
      this.$refs.formRef?.resetFields()
      this.dialogVisible = false
      this.config = null
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
        if (this.config?.id && !data.access_key_secret) {
          delete data.access_key_secret
        }
        if (this.config?.id) {
          data.id = this.config.id
        }
        await ossApi.saveOssConfig(data)
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