<template>
  <div class="overlay" v-if="visible" @click.self="handleClose">
    <div class="dialog">
      <div class="dialog-header">
        <span>{{ isEdit ? '编辑主机' : '添加主机' }}</span>
        <button class="dialog-close" @click="handleClose">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label>名称</label>
          <input v-model="form.name" placeholder="如：生产服务器" class="form-input" />
        </div>
        <div class="form-group">
          <label>主机地址</label>
          <input v-model="form.host" placeholder="IP 或域名" class="form-input" />
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>端口</label>
            <input v-model.number="form.port" type="number" placeholder="22" class="form-input" />
          </div>
          <div class="form-group" style="flex:2">
            <label>用户名</label>
            <input v-model="form.username" placeholder="root" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" class="form-input" />
        </div>
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <div v-if="testResult !== null" class="test-result" :class="{ success: testResult, fail: !testResult }">
          {{ testResult ? '连接测试成功' : '连接测试失败: ' + testError }}
        </div>
      </div>
      <div class="dialog-footer">
        <button v-if="!isEdit" class="btn-outline" @click="handleTest" :disabled="testing">
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
        <div class="footer-right">
          <button class="btn-outline" @click="handleClose">取消</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="loading">
            {{ loading ? '保存中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createPluginHost, updatePluginHost, testPluginHost } from '@/api/plugins/pluginApi'

export default {
  name: 'AddHostDialog',
  props: {
    modelValue: Boolean,
    hostData: Object,
  },
  emits: ['update:modelValue', 'success'],
  data() {
    return {
      visible: false,
      loading: false,
      testing: false,
      testResult: null,
      testError: '',
      errorMsg: '',
      form: {
        id: null,
        name: '',
        host: '',
        port: 22,
        username: '',
        password: '',
      },
    }
  },
  computed: {
    isEdit() {
      return !!this.form.id
    },
  },
  watch: {
    modelValue(val) {
      this.visible = val
      if (val && this.hostData) {
        this.form = {
          id: this.hostData.id || null,
          name: this.hostData.name || '',
          host: this.hostData.host || '',
          port: this.hostData.port || 22,
          username: this.hostData.username || '',
          password: '',
        }
        this.testResult = null
        this.errorMsg = ''
      } else if (val) {
        this.form = { id: null, name: '', host: '', port: 22, username: '', password: '' }
        this.testResult = null
        this.errorMsg = ''
      }
    },
    visible(val) {
      this.$emit('update:modelValue', val)
    },
  },
  methods: {
    handleClose() {
      this.visible = false
      this.testResult = null
      this.errorMsg = ''
    },
    async handleTest() {
      if (!this.form.host) {
        this.errorMsg = '请先输入主机地址'
        return
      }
      if (!this.form.id) {
        const res = await createPluginHost({
          name: this.form.name || 'temp',
          host: this.form.host,
          port: this.form.port,
          username: this.form.username || 'root',
          password: this.form.password || '',
        })
        this.form.id = res.data.id
      }
      this.testing = true
      try {
        const res = await testPluginHost(this.form.id)
        this.testResult = res.success
        if (!res.success) this.testError = res.error || '未知错误'
      } catch (e) {
        this.testResult = false
        this.testError = e.message
      } finally {
        this.testing = false
      }
    },
    async handleSubmit() {
      if (!this.form.name || !this.form.host || !this.form.username) {
        this.errorMsg = '名称、主机地址和用户名不能为空'
        return
      }
      if (this.isEdit && !this.form.password) {
        this.errorMsg = ''
      } else if (!this.isEdit && !this.form.password) {
        this.errorMsg = '密码不能为空'
        return
      }
      this.loading = true
      try {
        if (this.isEdit) {
          const data = {
            id: this.form.id,
            name: this.form.name,
            host: this.form.host,
            port: this.form.port,
            username: this.form.username,
          }
          if (this.form.password) data.password = this.form.password
          await updatePluginHost(data)
        } else {
          await createPluginHost({
            name: this.form.name,
            host: this.form.host,
            port: this.form.port,
            username: this.form.username,
            password: this.form.password,
          })
        }
        this.$emit('success')
        this.handleClose()
      } catch (e) {
        this.errorMsg = e.message
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  background: #fff;
  border-radius: 10px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
}
.dialog-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { padding: 20px 16px; }
.form-group {
  margin-bottom: 14px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}
.form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  background: #fff;
  color: var(--text-primary);
}
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-light); }
.form-row { display: flex; gap: 10px; }
.form-row .form-group { margin-bottom: 14px; }
.error-msg { color: #ef4444; font-size: 12px; margin-top: 4px; }
.test-result { font-size: 12px; margin-top: 8px; padding: 6px 10px; border-radius: 4px; }
.test-result.success { background: #ecfdf5; color: #065f46; }
.test-result.fail { background: #fef2f2; color: #991b1b; }
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.footer-right { display: flex; gap: 8px; }
.btn-outline {
  padding: 6px 14px;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  padding: 6px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
