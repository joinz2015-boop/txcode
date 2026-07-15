<template>
  <div class="settings-view">
    <div class="content-header">
      <div class="content-header-left">
        <span class="content-header-title">设置 · 供应商</span>
      </div>
    </div>
    <div class="settings-panel">
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon provider">🔌</div>
          <div>
            <div class="settings-card-title">DeepSeek</div>
            <div class="settings-card-subtitle">内置供应商 · deepseek-v3 / deepseek-r1</div>
          </div>
          <div style="margin-left:auto;">
            <button class="toggle-switch active" @click="toggleProvider('deepseek')" :class="{ active: providers.deepseek.enabled }"></button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">API 密钥</label>
          <div class="form-input-row">
            <input class="form-input" :type="deepseekKeyVisible ? 'text' : 'password'" v-model="providers.deepseek.apiKey" placeholder="sk-xxxxxxxxxxxxxxxx" />
            <button class="btn-outline" @click="deepseekKeyVisible = !deepseekKeyVisible">{{ deepseekKeyVisible ? '隐藏' : '显示' }}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">API 地址</label>
          <input class="form-input" v-model="providers.deepseek.apiUrl" placeholder="https://api.deepseek.com/v1" />
        </div>
        <div style="text-align:right;margin-top:4px;">
          <button class="btn-outline" style="margin-right:8px;" @click="testConnection('deepseek')">测试连接</button>
          <button class="btn-primary" @click="saveProvider('deepseek')">保存</button>
        </div>
      </div>
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon provider">🔌</div>
          <div>
            <div class="settings-card-title">OpenAI</div>
            <div class="settings-card-subtitle">内置供应商 · gpt-4o / gpt-4-turbo</div>
          </div>
          <div style="margin-left:auto;">
            <button class="toggle-switch" @click="toggleProvider('openai')" :class="{ active: providers.openai.enabled }"></button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">API 密钥</label>
          <div class="form-input-row">
            <input class="form-input" :type="openaiKeyVisible ? 'text' : 'password'" v-model="providers.openai.apiKey" placeholder="sk-xxxxxxxxxxxxxxxx" />
            <button class="btn-outline" @click="openaiKeyVisible = !openaiKeyVisible">{{ openaiKeyVisible ? '隐藏' : '显示' }}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">API 地址</label>
          <input class="form-input" v-model="providers.openai.apiUrl" placeholder="https://api.openai.com/v1" />
        </div>
        <div style="text-align:right;margin-top:4px;">
          <button class="btn-outline" style="margin-right:8px;" @click="testConnection('openai')">测试连接</button>
          <button class="btn-primary" @click="saveProvider('openai')">保存</button>
        </div>
      </div>
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon provider">➕</div>
          <div>
            <div class="settings-card-title">自定义供应商</div>
            <div class="settings-card-subtitle">兼容 OpenAI 接口格式的第三方服务</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">供应商名称</label>
          <input class="form-input" v-model="customProvider.name" placeholder="例如：Ollama / vLLM / 本地模型" />
        </div>
        <div class="form-group">
          <label class="form-label">API 密钥（选填）</label>
          <input class="form-input" type="password" v-model="customProvider.apiKey" placeholder="输入 API 密钥" />
        </div>
        <div class="form-group">
          <label class="form-label">API 地址</label>
          <input class="form-input" v-model="customProvider.apiUrl" placeholder="https://your-api.example.com/v1" />
        </div>
        <div style="text-align:right;margin-top:4px;">
          <button class="btn-primary" @click="addCustomProvider">添加供应商</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopSettingsView',
  data() {
    return {
      deepseekKeyVisible: false,
      openaiKeyVisible: false,
      providers: {
        deepseek: { enabled: true, apiKey: 'sk-••••••••••••••••', apiUrl: 'https://api.deepseek.com/v1' },
        openai: { enabled: false, apiKey: '', apiUrl: 'https://api.openai.com/v1' }
      },
      customProvider: { name: '', apiKey: '', apiUrl: '' }
    }
  },
  methods: {
    open(data) {
      // initialize / refresh view
    },
    toggleProvider(name) {
      this.providers[name].enabled = !this.providers[name].enabled
    },
    saveProvider(name) {
      alert(`"${name}" 供应商配置已保存。`)
    },
    testConnection(name) {
      alert(`正在测试 "${name}" 的连接…`)
      setTimeout(() => { alert(`"${name}" 连接成功！`) }, 800)
    },
    addCustomProvider() {
      if (!this.customProvider.name) { alert('请输入供应商名称'); return }
      if (!this.customProvider.apiUrl) { alert('请输入 API 地址'); return }
      alert(`自定义供应商 "${this.customProvider.name}" 已添加。`)
      this.customProvider = { name: '', apiKey: '', apiUrl: '' }
    }
  }
}
</script>

<style scoped>
.settings-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content-header { height: 44px; min-height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border-bottom: 1px solid var(--border); background: var(--bg-chat); flex-shrink: 0; }
.content-header-left { display: flex; align-items: center; gap: 10px; }
.content-header-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.settings-panel { flex: 1; overflow-y: auto; padding: 24px 28px; }
.settings-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; transition: box-shadow 0.2s; }
.settings-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.settings-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.settings-card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.settings-card-icon.provider { background: #eef1ff; color: #4f6ef7; }
.settings-card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.settings-card-subtitle { font-size: 11px; color: var(--text-muted); }
.form-group { margin-bottom: 12px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-input { width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none; font-family: inherit; transition: all 0.15s; box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,110,247,0.06); background: #fff; }
.form-input-row { display: flex; gap: 8px; }
.form-input-row .form-input { flex: 1; }
.toggle-switch { width: 40px; height: 22px; border-radius: 11px; background: #d0d0d8; cursor: pointer; position: relative; transition: background 0.2s; border: none; display: inline-block; outline: none; }
.toggle-switch.active { background: var(--accent); }
.toggle-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
.toggle-switch.active::after { left: 21px; }
.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.btn-primary:hover { filter: brightness(1.08); }
.btn-outline { padding: 7px 16px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.btn-outline:hover { border-color: var(--accent); color: var(--accent); }
</style>
