<template>
  <div class="settings-view">
    <div class="settings-tabs">
      <div class="tabs-header">设置</div>
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </div>
    </div>

    <div class="settings-content">
      <div v-show="activeTab === 'providers'" class="providers-panel">
        <div class="providers-top-bar">
          <span class="providers-title">AI 服务商 & 模型</span>
          <div class="providers-top-actions">
            <button class="btn-outline-sm" @click="handleExportConfig">导出配置</button>
            <button class="btn-outline-sm" @click="handleImportConfig">导入配置</button>
            <button class="btn-primary-sm" @click="openProviderDialog(null)">+ 添加服务商</button>
          </div>
        </div>

        <div class="provider-card official-provider">
          <div class="provider-main" @click="toggleProvider('songbing-official')">
            <span class="expand-icon" :class="{ expanded: expandedProviders.includes('songbing-official') }">▶</span>
            <div class="provider-logo official-logo">S</div>
            <div class="provider-info">
              <div class="provider-name">
                自建AI平台
                <span v-if="songbingProvider" class="tag tag-success">已认证</span>
              </div>
              <div class="provider-url">{{ songbingPlatformUrl }}</div>
            </div>
            <div class="provider-actions">
              <button class="btn-outline-sm" @click.stop="handleAuthSongbing">{{ songbingProvider ? '重新认证' : '认证' }}</button>
              <button class="btn-primary-sm" @click.stop="handleSyncSongbingModels">同步模型</button>
              <button v-if="songbingProvider" class="btn-danger-sm" @click.stop="handleCancelSongbingAuth">取消认证</button>
            </div>
          </div>
          <div class="models-panel" :class="{ expanded: expandedProviders.includes('songbing-official') }">
            <div v-if="songbingModels.length === 0" class="empty-hint">暂无模型，请先认证后同步</div>
            <div v-for="model in songbingModels" :key="model.id" class="model-row">
              <span class="model-name">{{ model.name }}</span>
            </div>
          </div>
        </div>

        <div v-for="provider in nonOfficialProviders" :key="provider.id" class="provider-card">
          <div class="provider-main" @click="toggleProvider(provider.id)">
            <span class="expand-icon" :class="{ expanded: expandedProviders.includes(provider.id) }">▶</span>
            <div class="provider-logo">{{ provider.name.charAt(0).toUpperCase() }}</div>
            <div class="provider-info">
              <div class="provider-name">
                {{ provider.name }}
                <span v-if="provider.isDefault" class="tag tag-success">默认</span>
              </div>
              <div class="provider-url">{{ provider.baseUrl }}</div>
            </div>
            <div class="provider-actions">
              <button class="btn-outline-sm" @click.stop="openProviderDialog(provider)">修改</button>
              <button class="btn-danger-sm" @click.stop="handleDeleteProvider(provider)">删除</button>
            </div>
          </div>
          <div class="models-panel" :class="{ expanded: expandedProviders.includes(provider.id) }">
            <div class="models-header">
              <span class="models-title">模型列表</span>
              <button class="btn-primary-sm" @click.stop="openModelDialog(provider.id, null)">+ 添加模型</button>
            </div>
            <div v-if="getModelsByProvider(provider.id).length === 0" class="empty-hint">暂无模型</div>
            <div v-for="model in getModelsByProvider(provider.id)" :key="model.id" class="model-row">
              <span class="model-name">{{ model.name }}</span>
              <div style="margin-left:auto;display:flex;gap:6px;">
                <button class="btn-outline-sm" @click.stop="openModelDialog(provider.id, model)">修改</button>
                <button class="btn-danger-sm" @click.stop="handleDeleteModel(model)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="nonOfficialProviders.length === 0" class="empty-hint">暂无服务商</div>
      </div>

      <div v-show="activeTab === 'proxy'" class="proxy-panel">
        <h3 class="panel-title">代理设置</h3>
        <div class="proxy-form">
          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" v-model="proxyConfig.enabled" @change="saveProxyConfig" />
              <span>启用代理</span>
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">代理类型</label>
            <select class="form-select" v-model="proxyConfig.type" @change="saveProxyConfig" :disabled="!proxyConfig.enabled">
              <option value="http">HTTP</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">代理 IP</label>
            <input class="form-input" v-model="proxyConfig.host" @blur="saveProxyConfig" :disabled="!proxyConfig.enabled" placeholder="127.0.0.1" />
          </div>
          <div class="form-group">
            <label class="form-label">代理端口</label>
            <input class="form-input" type="number" v-model.number="proxyConfig.port" @blur="saveProxyConfig" :disabled="!proxyConfig.enabled" placeholder="1080" min="1" max="65535" />
          </div>
        </div>
      </div>
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
  createProvider, updateProvider, deleteProvider, setDefaultProvider,
  getModels, createModel, updateModel, deleteModel,
  exportConfig, importConfig,
  getProxyConfig, updateProxyConfig,
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
      activeTab: 'providers',
      tabs: [
        { key: 'providers', label: 'AI 服务商' },
        { key: 'proxy', label: '代理设置' },
      ],
      providers: [],
      models: [],
      expandedProviders: [],
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
      proxyConfig: {
        enabled: false,
        type: 'http',
        host: '',
        port: 1080,
      },
      songbingConfig: { platformUrl: '', apiBaseUrl: '' },
      pollTimer: null,
    }
  },
  computed: {
    nonOfficialProviders() {
      return this.providers.filter(p => p.name !== '自建AI平台')
    },
    songbingModels() {
      if (!this.songbingProvider) return []
      return this.models.filter(m => m.providerId === this.songbingProvider.id)
    },
    songbingPlatformUrl() {
      const url = this.songbingProvider?.baseUrl || ''
      return url.replace(/\/api\/v1$/, '')
    },
    songbingProvider() {
      return this.providers.find(p => p.name === '自建AI平台') || null
    },
  },
  methods: {
    toggleProvider(providerId) {
      const idx = this.expandedProviders.indexOf(providerId)
      if (idx > -1) {
        this.expandedProviders.splice(idx, 1)
      } else {
        this.expandedProviders.push(providerId)
      }
    },
    getModelsByProvider(providerId) {
      return this.models.filter(m => m.providerId === providerId)
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

    // Proxy Config
    async loadProxyConfig() {
      try {
        const r = await getProxyConfig()
        if (r.data) {
          this.proxyConfig = {
            enabled: r.data.enabled || false,
            type: r.data.type || 'http',
            host: r.data.host || '',
            port: r.data.port || 1080,
          }
        }
      } catch (e) {}
    },

    async saveProxyConfig() {
      try {
        await updateProxyConfig(this.proxyConfig)
      } catch (e) {
        console.error('保存代理配置失败:', e)
      }
    },

    // Set Default Provider
    async handleSetDefault(provider) {
      try {
        await setDefaultProvider(provider.id)
        await this.loadProviders()
        await this.loadModels()
      } catch (e) {
        alert('设置默认失败: ' + e.message)
      }
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
            enabled: true
          })
        } else {
          await createModel({ ...this.modelForm, enabled: true })
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
    this.loadProxyConfig()
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

/* Tabs Navigation */
.settings-tabs {
  width: 160px;
  min-width: 160px;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px 0;
}
.tabs-header {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  padding: 0 16px 12px;
}
.tab-item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.tab-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.tab-item.active {
  color: var(--text-primary);
  background: var(--accent-light);
  border-left-color: var(--accent);
}

/* Content Area */
.settings-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Providers Panel - Collapsible */
.providers-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.providers-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.providers-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.providers-top-actions {
  display: flex;
  gap: 8px;
}

/* Provider Card */
.provider-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  background: #fff;
}
.provider-main {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.provider-main:hover {
  background: var(--bg-hover);
}
.expand-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  margin-right: 8px;
  color: var(--text-muted);
  font-size: 10px;
  flex-shrink: 0;
}
.expand-icon.expanded {
  transform: rotate(90deg);
}
.provider-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eef1ff;
  color: #4f6ef7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  margin-right: 10px;
  flex-shrink: 0;
}
.provider-logo.official-logo {
  background: #fef3c7;
  color: #d97706;
}
.provider-info {
  flex: 1;
  min-width: 0;
}
.provider-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.provider-url {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}
.provider-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Models Panel */
.models-panel {
  display: none;
  padding: 0 16px 16px;
  background: var(--bg-side);
  border-top: 1px solid var(--border);
}
.models-panel.expanded {
  display: block;
}
.models-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 8px;
}
.models-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
.model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 6px;
}
.model-name { font-size: 13px; color: var(--text-primary); flex: 1; }
.tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.tag-success { background: #ecfdf5; color: #059669; }
.tag-muted { background: #f3f4f6; color: #6b7280; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; }

/* Proxy Panel */
.proxy-panel {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}
.proxy-form {
  max-width: 480px;
}

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
.form-input:disabled { opacity: 0.5; cursor: not-allowed; }
.form-select { width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none; font-family: inherit; box-sizing: border-box; }
.form-select:disabled { opacity: 0.5; cursor: not-allowed; }
.form-error { font-size: 11px; color: #ef4444; margin-top: 2px; display: block; }
.form-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; padding: 8px; background: #f0f4ff; border-radius: 4px; }
.form-checkbox { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.form-checkbox input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
</style>
