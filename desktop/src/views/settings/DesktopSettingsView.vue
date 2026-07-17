<template>
  <div class="settings-view">
    <div class="settings-left">
      <div class="left-header">
        <span class="left-title">供应商</span>
        <button class="btn-primary-sm" @click="openProviderDialog(null)">+ 添加</button>
      </div>
      <div class="left-list">
        <div
          v-for="provider in allProviders"
          :key="provider.id"
          class="provider-item"
          :class="{ active: selectedProviderId === provider.id }"
          @click="selectProvider(provider.id)"
        >
          <div class="provider-item-icon">{{ provider.name.charAt(0).toUpperCase() }}</div>
          <div class="provider-item-info">
            <div class="provider-item-name">
              {{ provider.name }}
              <span v-if="provider.isDefault" class="tag-default">默认</span>
            </div>
            <div class="provider-item-url">{{ provider.baseUrl || '自建平台' }}</div>
          </div>
        </div>
        <div v-if="allProviders.length === 0" class="left-empty">暂无供应商</div>
      </div>
    </div>
    <div class="settings-right">
      <template v-if="selectedProvider">
        <div class="right-header">
          <div class="right-header-left">
            <div class="right-provider-icon">{{ selectedProvider.name.charAt(0).toUpperCase() }}</div>
            <div>
              <div class="right-provider-name">{{ selectedProvider.name }}</div>
              <div class="right-provider-url">{{ selectedProvider.baseUrl || '自建平台' }}</div>
            </div>
          </div>
          <div class="right-header-actions">
            <template v-if="selectedProvider.name === '自建AI平台'">
              <button class="btn-outline-sm" @click="handleAuthSongbing">重新认证</button>
              <button class="btn-primary-sm" @click="handleSyncSongbingModels">同步模型</button>
              <button class="btn-danger-sm" @click="handleCancelSongbingAuth">取消认证</button>
            </template>
            <template v-else>
              <button class="btn-outline-sm" @click="openProviderDialog(selectedProvider)">修改</button>
              <button class="btn-danger-sm" @click="handleDeleteProvider(selectedProvider)">删除</button>
            </template>
          </div>
        </div>
        <div class="right-body">
          <div class="models-header">
            <span class="models-title">模型列表</span>
            <button class="btn-primary-sm" @click="openModelDialog(selectedProvider.id, null)">+ 添加模型</button>
          </div>
          <div v-if="providerModels.length === 0" class="empty-hint">暂无模型</div>
          <div v-for="model in providerModels" :key="model.id" class="model-row">
            <span class="model-name">{{ model.name }}</span>
            <span class="tag" :class="model.enabled ? 'tag-success' : 'tag-muted'">{{ model.enabled ? '启用' : '禁用' }}</span>
            <div style="margin-left:auto;display:flex;gap:6px;">
              <button class="btn-outline-sm" @click="openModelDialog(selectedProvider.id, model)">修改</button>
              <button class="btn-danger-sm" @click="handleDeleteModel(model)">删除</button>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="right-empty">请从左侧选择一个供应商</div>
    </div>

    <!-- Provider Dialog -->
    <div v-if="showProviderDialog" class="modal-overlay" @click.self="closeProviderDialog">
      <div class="modal-content">
        <div class="modal-header">
          <span>{{ editingProvider ? '编辑服务商' : '添加服务商' }}</span>
          <button class="modal-close" @click="closeProviderDialog">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group" v-if="!editingProvider">
            <label class="form-label">预设模板</label>
            <select class="form-select" v-model="selectedPreset" @change="onPresetChange">
              <option value="">自定义</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="minimax">MiniMax</option>
              <option value="zlm">ZLM</option>
              <option value="qwen">Qwen</option>
              <option value="xiaomi_mimo">Xiaomi Mimo</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">名称 <span class="required">*</span></label>
            <input class="form-input" v-model="providerForm.name" placeholder="例如: OpenAI" />
            <span v-if="providerFormError.name" class="form-error">{{ providerFormError.name }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">API Key <span class="required">*</span></label>
            <input class="form-input" v-model="providerForm.apiKey" :placeholder="editingProvider ? '留空则不修改' : 'sk-...'" />
            <span v-if="providerFormError.apiKey" class="form-error">{{ providerFormError.apiKey }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">Base URL</label>
            <input class="form-input" v-model="providerForm.baseUrl" placeholder="https://api.openai.com/v1" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-outline" @click="closeProviderDialog">取消</button>
          <button class="btn-primary" @click="handleSaveProvider" :disabled="providerSaving">{{ providerSaving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- Model Dialog -->
    <div v-if="showModelDialog" class="modal-overlay" @click.self="closeModelDialog">
      <div class="modal-content">
        <div class="modal-header">
          <span>{{ editingModel ? '编辑模型' : '添加模型' }}</span>
          <button class="modal-close" @click="closeModelDialog">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group" v-if="!editingModel">
            <label class="form-label">所属服务商 <span class="required">*</span></label>
            <select class="form-select" v-model="modelForm.providerId">
              <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <span v-if="modelFormError.providerId" class="form-error">{{ modelFormError.providerId }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">模型名称 <span class="required">*</span></label>
            <input class="form-input" v-model="modelForm.name" placeholder="例如: GPT-4" />
            <span v-if="modelFormError.name" class="form-error">{{ modelFormError.name }}</span>
          </div>
          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" v-model="modelForm.enabled" />
              <span>启用</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-outline" @click="closeModelDialog">取消</button>
          <button class="btn-primary" @click="handleSaveModel" :disabled="modelSaving">{{ modelSaving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- Auth Dialog -->
    <div v-if="showAuthDialog" class="modal-overlay" @click.self="showAuthDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <span>自建AI平台认证</span>
          <button class="modal-close" @click="showAuthDialog = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">平台地址</label>
            <input class="form-input" v-model="authForm.platformUrl" placeholder="https://your-platform.example.com" />
          </div>
          <div class="form-hint">填写您的自建AI平台服务地址（需要支持 OpenAI 兼容接口）</div>
        </div>
        <div class="modal-footer">
          <button class="btn-outline" @click="showAuthDialog = false">取消</button>
          <button class="btn-primary" @click="handleConfirmAuth" :disabled="authLoading">{{ authLoading ? '认证中...' : '开始认证' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  listProviders, getProvider as getProviderDetail,
  createProvider, updateProvider, deleteProvider,
  getModels, createModel, updateModel, deleteModel,
  exportConfig, importConfig,
  getSongbingConfig, startSongbingAuth, verifySongbingAuth, cancelSongbingAuth, syncSongbingModels
} from '@/api/index'

const presets = [
  { name: 'openai', nameValue: 'OpenAI', baseUrlValue: 'https://api.openai.com/v1' },
  { name: 'deepseek', nameValue: 'DeepSeek', baseUrlValue: 'https://api.deepseek.com/v1' },
  { name: 'minimax', nameValue: 'MiniMax', baseUrlValue: 'https://api.minimax.io/v1' },
  { name: 'zlm', nameValue: 'ZLM', baseUrlValue: 'https://open.bigmodel.cn/api/paas/v4/' },
  { name: 'qwen', nameValue: 'Qwen', baseUrlValue: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' },
  { name: 'xiaomi_mimo', nameValue: 'Xiaomi Mimo', baseUrlValue: 'https://api.xiaomimimo.com/v1' },
  { name: 'openrouter', nameValue: 'OpenRouter', baseUrlValue: 'https://openrouter.ai/api/v1' }
]

export default {
  name: 'DesktopSettingsView',
  inject: ['desktopState'],
  data() {
    return {
      loading: true,
      providers: [],
      models: [],
      selectedProviderId: '',
      showProviderDialog: false,
      editingProvider: null,
      selectedPreset: '',
      providerForm: { name: '', apiKey: '', baseUrl: '' },
      providerFormError: { name: '', apiKey: '' },
      providerSaving: false,
      showModelDialog: false,
      editingModel: null,
      modelForm: { providerId: '', name: '', enabled: true },
      modelFormError: { providerId: '', name: '' },
      modelSaving: false,
      showAuthDialog: false,
      authForm: { platformUrl: '' },
      authLoading: false,
      songbingConfig: { platformUrl: '', apiBaseUrl: '' },
      pollTimer: null,
    }
  },
  computed: {
    allProviders() {
      return [...this.providers]
    },
    selectedProvider() {
      return this.providers.find(p => p.id === this.selectedProviderId) || null
    },
    providerModels() {
      if (!this.selectedProviderId) return []
      return this.models.filter(m => m.providerId === this.selectedProviderId)
    },
    songbingProvider() {
      return this.providers.find(p => p.name === '自建AI平台') || null
    },
  },
  methods: {
    selectProvider(id) {
      this.selectedProviderId = id
    },
    async loadData() {
      this.loading = true
      try {
        await Promise.all([this.loadProviders(), this.loadModels(), this.loadSongbingConfig()])
      } finally {
        this.loading = false
      }
    },
    async loadProviders() {
      try {
        const r = await listProviders()
        this.providers = r.data || []
        if (!this.selectedProviderId && this.providers.length > 0) {
          this.selectedProviderId = this.providers[0].id
        }
      } catch (e) {
        console.error('加载服务商失败:', e)
      }
    },
    async loadModels() {
      try {
        const r = await getModels()
        this.models = r.data || []
      } catch (e) {
        console.error('加载模型失败:', e)
      }
    },
    async loadSongbingConfig() {
      try {
        const r = await getSongbingConfig()
        this.songbingConfig = r.data || { platformUrl: '', apiBaseUrl: '' }
      } catch (e) {}
    },

    // Provider Dialog
    openProviderDialog(provider) {
      this.editingProvider = provider
      this.selectedPreset = ''
      this.providerFormError = { name: '', apiKey: '' }
      if (provider) {
        this.loadProviderDetail(provider.id)
      } else {
        this.providerForm = { name: '', apiKey: '', baseUrl: '' }
      }
      this.showProviderDialog = true
    },
    async loadProviderDetail(providerId) {
      try {
        const r = await getProviderDetail(providerId)
        const d = r.data || {}
        this.providerForm = {
          name: this.editingProvider.name,
          apiKey: d.apiKey || '',
          baseUrl: this.editingProvider.baseUrl || ''
        }
      } catch (e) {
        this.providerForm = {
          name: this.editingProvider.name,
          apiKey: '',
          baseUrl: this.editingProvider.baseUrl || ''
        }
      }
    },
    onPresetChange() {
      const preset = presets.find(p => p.name === this.selectedPreset)
      if (preset) {
        this.providerForm.name = preset.nameValue
        this.providerForm.baseUrl = preset.baseUrlValue
      }
    },
    closeProviderDialog() {
      this.showProviderDialog = false
      this.editingProvider = null
      this.selectedPreset = ''
    },
    async handleSaveProvider() {
      this.providerFormError = { name: '', apiKey: '' }
      let valid = true
      if (!this.providerForm.name.trim()) {
        this.providerFormError.name = '请输入名称'
        valid = false
      }
      if (!this.editingProvider && !this.providerForm.apiKey.trim()) {
        this.providerFormError.apiKey = '请输入 API Key'
        valid = false
      }
      if (!valid) return
      this.providerSaving = true
      try {
        if (this.editingProvider) {
          const data = { name: this.providerForm.name, baseUrl: this.providerForm.baseUrl }
          if (this.providerForm.apiKey) data.apiKey = this.providerForm.apiKey
          await updateProvider(this.editingProvider.id, data)
        } else {
          await createProvider(this.providerForm)
        }
        await this.loadProviders()
        this.closeProviderDialog()
      } catch (e) {
        alert('保存失败: ' + e.message)
      } finally {
        this.providerSaving = false
      }
    },
    async handleDeleteProvider(provider) {
      if (!confirm(`确定要删除服务商"${provider.name}"吗？`)) return
      try {
        await deleteProvider(provider.id)
        if (this.selectedProviderId === provider.id) {
          this.selectedProviderId = ''
        }
        await this.loadProviders()
        await this.loadModels()
      } catch (e) {
        alert('删除失败: ' + e.message)
      }
    },

    // Model Dialog
    openModelDialog(providerId, model) {
      this.editingModel = model
      this.modelFormError = { providerId: '', name: '' }
      if (model) {
        this.modelForm = { providerId: model.providerId, name: model.name, enabled: model.enabled }
      } else {
        this.modelForm = { providerId: providerId || '', name: '', enabled: true }
      }
      this.showModelDialog = true
    },
    closeModelDialog() {
      this.showModelDialog = false
      this.editingModel = null
    },
    async handleSaveModel() {
      this.modelFormError = { providerId: '', name: '' }
      let valid = true
      if (!this.editingModel && !this.modelForm.providerId) {
        this.modelFormError.providerId = '请选择服务商'
        valid = false
      }
      if (!this.modelForm.name.trim()) {
        this.modelFormError.name = '请输入模型名称'
        valid = false
      }
      if (!valid) return
      this.modelSaving = true
      try {
        if (this.editingModel) {
          await updateModel(this.editingModel.id, {
            name: this.modelForm.name,
            enabled: this.modelForm.enabled
          })
        } else {
          await createModel(this.modelForm)
        }
        await this.loadModels()
        this.closeModelDialog()
      } catch (e) {
        alert('保存失败: ' + e.message)
      } finally {
        this.modelSaving = false
      }
    },
    async handleDeleteModel(model) {
      if (!confirm(`确定要删除模型"${model.name}"吗？`)) return
      try {
        await deleteModel(model.id)
        await this.loadModels()
      } catch (e) {
        alert('删除失败: ' + e.message)
      }
    },

    // Config Export/Import
    async handleExportConfig() {
      try {
        const blob = await exportConfig()
        const now = new Date()
        const ts = now.getFullYear().toString() +
          (now.getMonth() + 1).toString().padStart(2, '0') +
          now.getDate().toString().padStart(2, '0') + '_' +
          now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0') +
          now.getSeconds().toString().padStart(2, '0')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `config_${ts}.yml`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        alert('导出失败: ' + e.message)
      }
    },
    handleImportConfig() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.yml,.yaml'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
          const content = await file.text()
          const res = await importConfig(content)
          if (res.success) {
            await this.loadData()
          } else {
            alert('导入失败: ' + res.error)
          }
        } catch (e) {
          alert('导入失败: ' + e.message)
        }
      }
      input.click()
    },

    // Songbing Auth
    handleAuthSongbing() {
      this.authForm.platformUrl = this.songbingConfig.platformUrl || ''
      this.showAuthDialog = true
    },
    async handleConfirmAuth() {
      const platformUrl = this.authForm.platformUrl.trim()
      if (!platformUrl) { alert('请输入平台地址'); return }
      if (!platformUrl.startsWith('http://') && !platformUrl.startsWith('https://')) {
        alert('平台地址必须以 http:// 或 https:// 开头'); return
      }
      this.showAuthDialog = false
      this.authLoading = true
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
      try {
        const res = await startSongbingAuth(platformUrl)
        const { key, auth_url } = res.data
        window.open(platformUrl + auth_url, '_blank')
        let attempts = 0
        this.pollTimer = setInterval(async () => {
          attempts++
          if (attempts >= 100) {
            clearInterval(this.pollTimer)
            this.pollTimer = null
            this.authLoading = false
            return
          }
          try {
            const vRes = await verifySongbingAuth(key)
            if (vRes.data && vRes.data.active) {
              clearInterval(this.pollTimer)
              this.pollTimer = null
              await this.loadProviders()
              await this.loadModels()
              this.authLoading = false
            }
          } catch (e) {}
        }, 3000)
      } catch (e) {
        alert('认证失败: ' + e.message)
        this.authLoading = false
      }
    },
    async handleCancelSongbingAuth() {
      if (!confirm('确定要取消认证吗？取消后已同步的模型将被删除。')) return
      try {
        await cancelSongbingAuth()
        await this.loadProviders()
        await this.loadModels()
      } catch (e) {
        alert('取消认证失败: ' + e.message)
      }
    },
    async handleSyncSongbingModels() {
      try {
        await syncSongbingModels()
        await this.loadModels()
      } catch (e) {
        alert('同步模型失败: ' + e.message)
      }
    },
  },
  mounted() {
    this.loadData()
  },
  beforeDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer)
  },
}
</script>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Left Panel */
.settings-left {
  width: 230px;
  min-width: 230px;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.left-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.left-list { flex: 1; overflow-y: auto; }
.left-empty { text-align: center; color: var(--text-muted); padding: 30px; font-size: 13px; }
.provider-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all 0.15s;
}
.provider-item:hover { background: var(--bg-hover); }
.provider-item.active { background: var(--accent-light); border-left-color: var(--accent); }
.provider-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #eef1ff;
  color: #4f6ef7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}
.provider-item-info { flex: 1; min-width: 0; }
.provider-item-name { font-size: 13px; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
.provider-item-url { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-default { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #ecfdf5; color: #059669; }

/* Right Panel */
.settings-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.right-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
}
.right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.right-header-left { display: flex; align-items: center; gap: 10px; }
.right-provider-icon {
  width: 36px; height: 36px; border-radius: 8px;
  background: #eef1ff; color: #4f6ef7;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
}
.right-provider-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.right-provider-url { font-size: 11px; color: var(--text-muted); }
.right-header-actions { display: flex; gap: 6px; }
.right-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.models-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.models-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.model-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: #fff; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px;
}
.model-name { font-size: 13px; color: var(--text-primary); flex: 1; }
.tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.tag-success { background: #ecfdf5; color: #059669; }
.tag-muted { background: #f3f4f6; color: #6b7280; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; }

/* Buttons */
.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-primary:hover { filter: brightness(1.08); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary-sm { padding: 5px 12px; background: var(--accent); color: #fff; border: none; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-primary-sm:hover { filter: brightness(1.08); }
.btn-outline { padding: 7px 16px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
.btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.btn-outline-sm { padding: 5px 12px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; }
.btn-outline-sm:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger-sm { padding: 5px 12px; background: #fff; color: #ef4444; border: 1px solid #fecaca; border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; }
.btn-danger-sm:hover { background: #fef2f2; border-color: #ef4444; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-content { background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); width: 480px; max-width: 90vw; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; color: var(--text-primary); }
.modal-close { width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.modal-body { padding: 18px; }
.modal-footer { padding: 12px 18px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-label .required { color: #ef4444; }
.form-input { width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none; font-family: inherit; box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,110,247,0.06); background: #fff; }
.form-select { width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none; font-family: inherit; box-sizing: border-box; }
.form-error { font-size: 11px; color: #ef4444; margin-top: 2px; display: block; }
.form-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; padding: 8px; background: #f0f4ff; border-radius: 4px; }
.form-checkbox { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.form-checkbox input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
</style>
