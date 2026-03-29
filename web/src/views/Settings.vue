<template>
  <div class="flex-1 flex overflow-hidden bg-[#1e1e1e]">
    <aside class="w-[220px] bg-sidebar border-r border-border shrink-0 py-4">
      <h2 class="text-white font-bold text-lg px-4 mb-4">设置</h2>
      <nav class="space-y-1">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="activeTab = tab.name"
          class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
          :class="activeTab === tab.name ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </nav>
    </aside>

    <main class="flex-1 overflow-y-auto p-6">
      <div class="max-w-3xl mx-auto">
        <div v-show="activeTab === 'providers'">
          <ProviderList
            :providers="providers"
            :models="models"
            @add-provider="openProviderDialog(null)"
            @edit-provider="openProviderDialog($event)"
            @delete-provider="deleteProvider"
            @add-model="openModelDialog($event, null)"
            @edit-model="openModelDialog($event.providerId, $event)"
            @delete-model="deleteModel"
          />
        </div>

        <div v-show="activeTab === 'skills'">
          <h3 class="text-xl text-white mb-4">Skills</h3>
          <SkillsList :skills="skills" />
        </div>

        <div v-show="activeTab === 'advanced'">
          <h3 class="text-xl text-white mb-4">高级设置</h3>
          <el-form label-width="150px" class="advanced-form">
            <el-form-item label="最大工具轮数">
              <el-input-number
                v-model="config.maxToolIterations"
                :min="1"
                :max="100"
                @change="saveConfig('maxToolIterations', $event)"
              />
            </el-form-item>
            <el-form-item label="会话压缩阈值">
              <el-input-number
                v-model="config.maxSessionCompression"
                :min="1"
                :max="100"
                @change="saveConfig('maxSessionCompression', $event)"
              />
            </el-form-item>
            <el-form-item label="Web 服务端口">
              <el-input-number
                v-model="config.webPort"
                :min="1024"
                :max="65535"
                @change="saveConfig('web.port', $event)"
              />
            </el-form-item>
          </el-form>
        </div>

        <div v-show="activeTab === 'gateway'">
          <h3 class="text-xl text-white mb-4">网关配置</h3>
          <el-form label-width="150px" class="gateway-form">
            <el-form-item label="启用钉钉机器人">
              <el-switch v-model="gateway.enabled" @change="saveGatewayConfig" />
            </el-form-item>
            <el-form-item label="Client ID">
              <el-input v-model="gateway.clientId" placeholder="请输入Client ID" @blur="saveGatewayConfig" />
            </el-form-item>
            <el-form-item label="Client Secret">
              <el-input v-model="gateway.clientSecret" type="password" placeholder="请输入Client Secret" @blur="saveGatewayConfig" />
            </el-form-item>
            <el-form-item label="运行状态">
              <el-tag :type="gatewayStatus.running ? 'success' : 'info'">
                {{ gatewayStatus.running ? '运行中' : '已停止' }}
              </el-tag>
              <span v-if="gatewayStatus.configured && !gatewayStatus.running" class="text-textMuted text-sm ml-2">
                (配置已保存，可启动)
              </span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="toggleGateway" :loading="gatewayLoading">
                {{ gatewayStatus.running ? '停止' : '启动' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </main>

    <ProviderDialog
      :visible.sync="showProviderDialog"
      :editing-provider="editingProvider"
      @success="loadProviders"
    />

    <ModelDialog
      :visible.sync="showModelDialog"
      :editing-model="editingModel"
      :providers="providers"
      :default-provider-id="defaultProviderId"
      @success="loadModels"
    />
  </div>
</template>

<script>
import ProviderList from '../components/ProviderList.vue'
import ProviderDialog from '../components/ProviderDialog.vue'
import ModelDialog from '../components/ModelDialog.vue'
import SkillsList from '../components/SkillsList.vue'

export default {
  name: 'Settings',

  components: {
    ProviderList,
    ProviderDialog,
    ModelDialog,
    SkillsList,
  },

  data() {
    return {
      activeTab: 'providers',
      tabs: [
        { name: 'providers', label: 'AI 服务商', icon: 'fa-solid fa-server' },
        { name: 'advanced', label: '高级', icon: 'fa-solid fa-gear' },
        { name: 'gateway', label: '网关', icon: 'fa-solid fa-plug' },
      ],
      providers: [],
      models: [],
      skills: [],
      defaultProviderId: null,
      config: {
        maxToolIterations: 10,
        maxSessionCompression: 5,
        webPort: 40000,
      },
      gateway: {
        enabled: false,
        clientId: '',
        clientSecret: '',
      },
      gatewayStatus: {
        running: false,
        configured: false,
      },
      gatewayLoading: false,
      showProviderDialog: false,
      editingProvider: null,
      showModelDialog: false,
      editingModel: null,
    }
  },

  created() {
    this.loadProviders()
    this.loadModels()
    this.loadSkills()
    this.loadConfig()
    this.loadGatewayConfig()
    this.loadGatewayStatus()
  },

  activated() {
    if (this.activeTab === 'gateway') {
      this.loadGatewayConfig()
      this.loadGatewayStatus()
    }
  },

  watch: {
    activeTab(newTab) {
      if (newTab === 'gateway') {
        this.loadGatewayConfig()
        this.loadGatewayStatus()
      }
    }
  },

  methods: {
    openProviderDialog(provider) {
      this.editingProvider = provider
      this.showProviderDialog = true
    },

    openModelDialog(providerId, model) {
      this.editingModel = model
      this.showModelDialog = true
    },

    async loadProviders() {
      try {
        const res = await this.$api.getProviders()
        this.providers = res.data || []
        const defaultProvider = this.providers.find(p => p.isDefault)
        this.defaultProviderId = defaultProvider?.id || null
      } catch (e) {
        this.$message.error('加载提供商失败: ' + e.message)
      }
    },

    async loadModels() {
      try {
        const res = await this.$api.getModels()
        this.models = res.data || []
      } catch (e) {
        this.$message.error('加载模型失败: ' + e.message)
      }
    },

    async loadSkills() {
      try {
        const res = await this.$api.getSkills()
        this.skills = res.data || []
      } catch (e) {
        this.skills = []
      }
    },

    async loadConfig() {
      try {
        const res = await this.$api.getConfig('ai.maxToolIterations')
        if (res.data?.value) {
          this.config.maxToolIterations = parseInt(res.data.value)
        }
      } catch (e) {}
    },

    async deleteProvider(id) {
      try {
        await this.$confirm('确定要删除该服务商吗？', '提示', { type: 'warning' })
        await this.$api.deleteProvider(id)
        this.$message.success('删除成功')
        await this.loadProviders()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败: ' + e.message)
        }
      }
    },

    async deleteModel(id) {
      try {
        await this.$confirm('确定要删除该模型吗？', '提示', { type: 'warning' })
        await this.$api.deleteModel(id)
        this.$message.success('删除成功')
        await this.loadModels()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败: ' + e.message)
        }
      }
    },

    async saveConfig(key, value) {
      try {
        await this.$api.setConfig(key, value)
        this.$message.success('配置已保存')
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    },

    async loadGatewayConfig() {
      try {
        const res = await this.$api.getDingtalkConfig()
        if (res.data) {
          this.gateway = {
            enabled: res.data.enabled || false,
            clientId: res.data.clientId || '',
            clientSecret: res.data.clientSecret || '',
          }
        }
      } catch (e) {
        console.error('Failed to load gateway config:', e)
      }
    },

    async loadGatewayStatus() {
      try {
        const res = await this.$api.getGatewayStatus()
        if (res.data) {
          this.gatewayStatus = {
            running: res.data.running || false,
            configured: res.data.configured || false,
          }
        }
      } catch (e) {
        console.error('Failed to load gateway status:', e)
      }
    },

    async saveGatewayConfig() {
      try {
        await this.$api.updateDingtalkConfig(this.gateway)
        this.$message.success('网关配置已保存')
        this.loadGatewayStatus()
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    },

    async toggleGateway() {
      this.gatewayLoading = true
      try {
        if (this.gatewayStatus.running) {
          await this.$api.stopDingtalk()
          this.$message.success('网关已停止')
        } else {
          if (!this.gateway.clientId || !this.gateway.clientSecret) {
            this.$message.error('请先配置 Client ID 和 Client Secret')
            this.gatewayLoading = false
            return
          }
          await this.$api.updateDingtalkConfig(this.gateway)
          await this.$api.startDingtalk()
          this.$message.success('网关已启动')
        }
        await this.loadGatewayStatus()
      } catch (e) {
        this.$message.error('操作失败: ' + e.message)
      } finally {
        this.gatewayLoading = false
      }
    },
  },
}
</script>

<style scoped>
.advanced-form {
  max-width: 500px;
  margin-top: 20px;
}

.gateway-form {
  max-width: 500px;
  margin-top: 20px;
}
</style>
