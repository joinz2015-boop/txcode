<template>
  <div class="settings-view">
    <div class="content-header">
      <div class="content-header-left">
        <span class="content-header-title">设置 · 供应商</span>
      </div>
      <div class="content-header-actions">
        <button class="btn-outline-sm" @click="handleExportConfig">导出配置</button>
        <button class="btn-outline-sm" @click="handleImportConfig">导入配置</button>
        <button class="btn-primary-sm" @click="openProviderDialog(null)">+ 添加服务商</button>
      </div>
    </div>
    <div class="settings-panel">
      <div v-if="loading" class="loading-state">加载中...</div>

      <template v-else>
        <div v-if="songbingProvider" class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-icon provider">S</div>
            <div>
              <div class="settings-card-title">自建AI平台 <span class="tag-success">已认证</span></div>
              <div class="settings-card-subtitle">{{ songbingPlatformUrl }}</div>
            </div>
            <div style="margin-left:auto;display:flex;gap:8px;">
              <button class="btn-outline-sm" @click="handleAuthSongbing">重新认证</button>
              <button class="btn-primary-sm" @click="handleSyncSongbingModels">同步模型</button>
              <button class="btn-danger-sm" @click="handleCancelSongbingAuth">取消认证</button>
            </div>
          </div>
          <div class="models-section">
            <div class="models-section-header">模型列表</div>
            <div v-if="songbingModels.length === 0" class="empty-hint">暂无模型，请先认证后同步</div>
            <div v-for="model in songbingModels" :key="model.id" class="model-row">
              <span class="model-name">{{ model.name }}</span>
              <span class="tag" :class="model.enabled ? 'tag-success' : 'tag-muted'">{{ model.enabled ? '启用' : '禁用' }}</span>
            </div>
          </div>
        </div>

        <div v-for="provider in nonOfficialProviders" :key="provider.id" class="settings-card">
          <div class="settings-card-header" @click="toggleProvider(provider.id)" style="cursor:pointer;">
            <span class="expand-arrow" :class="{ expanded: expandedProviders.includes(provider.id) }">▶</span>
            <div class="settings-card-icon provider">{{ provider.name.charAt(0).toUpperCase() }}</div>
            <div>
              <div class="settings-card-title">
                {{ provider.name }}
                <span v-if="provider.isDefault" class="tag-success">默认</span>
              </div>
              <div class="settings-card-subtitle">{{ provider.baseUrl }}</div>
            </div>
            <div style="margin-left:auto;display:flex;gap:8px;" @click.stop>
              <button class="btn-outline-sm" @click="openProviderDialog(provider)">修改</button>
              <button class="btn-danger-sm" @click="handleDeleteProvider(provider)">删除</button>
            </div>
          </div>
          <div v-show="expandedProviders.includes(provider.id)" class="models-section">
            <div class="models-section-header">
              <span>模型列表</span>
              <button class="btn-primary-sm" @click="openModelDialog(provider.id, null)">+ 添加模型</button>
            </div>
            <div v-if="getProviderModels(provider.id).length === 0" class="empty-hint">暂无模型</div>
            <div v-for="model in getProviderModels(provider.id)" :key="model.id" class="model-row">
              <span class="model-name">{{ model.name }}</span>
              <span class="tag" :class="model.enabled ? 'tag-success' : 'tag-muted'">{{ model.enabled ? '启用' : '禁用' }}</span>
              <div style="margin-left:auto;display:flex;gap:6px;">
                <button class="btn-outline-sm" @click.stop="openModelDialog(provider.id, model)">修改</button>
                <button class="btn-danger-sm" @click.stop="handleDeleteModel(model)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading && providers.length === 0 && !songbingProvider" class="empty-state">
          暂无服务商配置，请点击"添加服务商"开始。
        </div>
      </template>
    </div>

    <!-- Provider Dialog Modal -->
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

    <!-- Model Dialog Modal -->
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

    <!-- Auth Dialog Modal -->
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
  getModels, getModelsByProvider, createModel, updateModel, deleteModel,
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
  data() {
    return {
      loading: true,
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
      defaultProviderId: null,
      modelForm: { providerId: '', name: '', enabled: true },
      modelFormError: { providerId: '', name: '' },
      modelSaving: false,
      showAuthDialog: false,
      authForm: { platformUrl: '' },
      authLoading: false,
      songbingConfig: { platformUrl: '', apiBaseUrl: '' },
      songbingProvider: null,
      pollTimer: null
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
      const url = (this.songbingProvider && this.songbingProvider.baseUrl) || ''
      return url.replace(/\/api\/v1$/, '')
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
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
        const def = this.providers.find(p => p.isDefault)
        this.defaultProviderId = def ? def.id : null
        this.checkSongbingProvider()
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
      } catch (e) { /* ignore */ }
    },

    checkSongbingProvider() {
      this.songbingProvider = this.providers.find(p => p.name === '自建AI平台') || null
    },

    toggleProvider(providerId) {
      const idx = this.expandedProviders.indexOf(providerId)
      if (idx > -1) {
        this.expandedProviders.splice(idx, 1)
      } else {
        this.expandedProviders.push(providerId)
      }
    },

    getProviderModels(providerId) {
      return this.models.filter(m => m.providerId === providerId)
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
          this.showToast('更新成功')
        } else {
          await createProvider(this.providerForm)
          this.showToast('添加成功')
        }
        await this.loadProviders()
        this.closeProviderDialog()
      } catch (e) {
        this.showToast('保存失败: ' + e.message)
      } finally {
        this.providerSaving = false
      }
    },

    async handleDeleteProvider(provider) {
      if (!confirm(`确定要删除服务商"${provider.name}"吗？`)) return
      try {
        await deleteProvider(provider.id)
        this.showToast('删除成功')
        await this.loadProviders()
        await this.loadModels()
      } catch (e) {
        this.showToast('删除失败: ' + e.message)
      }
    },

    // Model Dialog
    openModelDialog(providerId, model) {
      this.editingModel = model
      this.modelFormError = { providerId: '', name: '' }
      if (model) {
        this.modelForm = {
          providerId: model.providerId,
          name: model.name,
          enabled: model.enabled
        }
      } else {
        this.modelForm = {
          providerId: providerId || this.defaultProviderId || '',
          name: '',
          enabled: true
        }
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
          this.showToast('更新成功')
        } else {
          await createModel(this.modelForm)
          this.showToast('添加成功')
        }
        await this.loadModels()
        this.closeModelDialog()
      } catch (e) {
        this.showToast('保存失败: ' + e.message)
      } finally {
        this.modelSaving = false
      }
    },

    async handleDeleteModel(model) {
      if (!confirm(`确定要删除模型"${model.name}"吗？`)) return
      try {
        await deleteModel(model.id)
        this.showToast('删除成功')
        await this.loadModels()
      } catch (e) {
        this.showToast('删除失败: ' + e.message)
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
        this.showToast('配置导出成功')
      } catch (e) {
        this.showToast('导出失败: ' + e.message)
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
            this.showToast('配置导入成功')
            await this.loadData()
          } else {
            this.showToast('导入失败: ' + res.error)
          }
        } catch (e) {
          this.showToast('导入失败: ' + e.message)
        }
      }
      input.click()
    },

    // Songbing Auth
    handleAuthSongbing() {
      this.authForm.platformUrl = this.songbingConfig.platformUrl || this.songbingPlatformUrl || ''
      this.showAuthDialog = true
    },

    async handleConfirmAuth() {
      const platformUrl = this.authForm.platformUrl.trim()
      if (!platformUrl) {
        this.showToast('请输入平台地址')
        return
      }
      if (!platformUrl.startsWith('http://') && !platformUrl.startsWith('https://')) {
        this.showToast('平台地址必须以 http:// 或 https:// 开头')
        return
      }
      this.showAuthDialog = false
      this.authLoading = true

      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }

      try {
        const res = await startSongbingAuth(platformUrl)
        const { key, auth_url } = res.data
        window.open(platformUrl + auth_url, '_blank')
        this.showToast('请在打开的页面完成授权，认证中...')

        let attempts = 0
        this.pollTimer = setInterval(async () => {
          attempts++
          if (attempts >= 100) {
            clearInterval(this.pollTimer)
            this.pollTimer = null
            this.showToast('认证超时，请重试')
            this.authLoading = false
            return
          }
          try {
            const vRes = await verifySongbingAuth(key)
            if (vRes.data && vRes.data.active) {
              clearInterval(this.pollTimer)
              this.pollTimer = null
              this.showToast(`认证成功！已同步 ${vRes.data.syncedModels || 0} 个模型`)
              await this.loadProviders()
              await this.loadModels()
              this.checkSongbingProvider()
              this.authLoading = false
            }
          } catch (e) { /* single failure doesn't interrupt */ }
        }, 3000)
      } catch (e) {
        this.showToast('认证失败: ' + e.message)
        this.authLoading = false
      }
    },

    async handleCancelSongbingAuth() {
      if (!confirm('确定要取消认证吗？取消后已同步的模型将被删除。')) return
      try {
        await cancelSongbingAuth()
        this.showToast('已取消认证')
        await this.loadProviders()
        await this.loadModels()
        this.songbingProvider = null
      } catch (e) {
        this.showToast('取消认证失败: ' + e.message)
      }
    },

    async handleSyncSongbingModels() {
      if (!this.songbingProvider) {
        this.showToast('请先完成认证')
        return
      }
      try {
        const res = await syncSongbingModels()
        this.showToast(`同步成功，新增 ${res.data.count} 个模型`)
        await this.loadModels()
      } catch (e) {
        this.showToast('同步模型失败: ' + e.message)
      }
    },

    showToast(msg) {
      alert(msg)
    }
  },
  beforeDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
    }
  }
}
</script>

<style scoped>
.settings-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content-header {
  height: 44px; min-height: 44px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; border-bottom: 1px solid var(--border); background: var(--bg-chat); flex-shrink: 0;
}
.content-header-left { display: flex; align-items: center; gap: 10px; }
.content-header-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.content-header-actions { display: flex; gap: 8px; }
.settings-panel { flex: 1; overflow-y: auto; padding: 24px 28px; }

.settings-card {
  background: #fff; border: 1px solid var(--border); border-radius: 10px;
  padding: 0; margin-bottom: 16px; overflow: hidden;
  transition: box-shadow 0.2s;
}
.settings-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.settings-card-header {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px;
}
.settings-card-icon {
  width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; font-size: 16px; font-weight: 700;
}
.settings-card-icon.provider { background: #eef1ff; color: #4f6ef7; }
.settings-card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.settings-card-subtitle { font-size: 11px; color: var(--text-muted); }

.expand-arrow {
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0;
}
.expand-arrow.expanded { transform: rotate(90deg); }

.models-section {
  border-top: 1px solid var(--border); padding: 12px 16px; background: #fafbfc;
}
.models-section-header {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px;
}
.model-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  background: #fff; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px;
}
.model-name { font-size: 13px; color: var(--text-primary); flex: 1; }

.tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.tag-success { background: #ecfdf5; color: #059669; }
.tag-muted { background: #f3f4f6; color: #6b7280; }

.empty-hint { text-align: center; color: var(--text-muted); padding: 16px; font-size: 13px; }
.empty-state { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
.loading-state { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }

.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-label .required { color: #ef4444; }
.form-input {
  width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none;
  font-family: inherit; transition: all 0.15s; box-sizing: border-box;
}
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,110,247,0.06); background: #fff; }
.form-select {
  width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none;
  font-family: inherit; box-sizing: border-box;
}
.form-select:focus { border-color: var(--accent); }
.form-error { font-size: 11px; color: #ef4444; margin-top: 2px; display: block; }
.form-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; padding: 8px; background: #f0f4ff; border-radius: 4px; }
.form-checkbox { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.form-checkbox input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }

/* Buttons */
.btn-primary {
  padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px;
  font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.btn-primary:hover { filter: brightness(1.08); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary-sm {
  padding: 5px 12px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.btn-primary-sm:hover { filter: brightness(1.08); }
.btn-outline {
  padding: 7px 16px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.btn-outline-sm {
  padding: 5px 12px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.btn-outline-sm:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger-sm {
  padding: 5px 12px; background: #fff; color: #ef4444; border: 1px solid #fecaca;
  border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.btn-danger-sm:hover { background: #fef2f2; border-color: #ef4444; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 480px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.modal-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px;
}
.modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.modal-body { padding: 18px; }
.modal-footer {
  padding: 12px 18px; border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 8px;
}
</style>
