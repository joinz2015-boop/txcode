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
        <!-- AI 服务商 -->
        <div v-show="activeTab === 'providers'">
          <h3 class="text-xl text-white mb-4">AI 服务商</h3>
          <ProviderList
            :providers="providers"
            :default-provider-id="defaultProviderId"
            @refresh="loadProviders"
            @set-default="setDefaultProvider"
          />
        </div>

        <!-- 模型 -->
        <div v-show="activeTab === 'models'">
          <h3 class="text-xl text-white mb-4">模型配置</h3>
          <ModelList
            :models="models"
            :providers="providers"
            @refresh="loadModels"
          />
        </div>

        <!-- Skills -->
        <div v-show="activeTab === 'skills'">
          <h3 class="text-xl text-white mb-4">Skills</h3>
          <SkillsList :skills="skills" />
        </div>

        <!-- 高级 -->
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
      </div>
    </main>
  </div>
</template>

<script>
import ProviderList from '../components/ProviderList.vue'
import ModelList from '../components/ModelList.vue'
import SkillsList from '../components/SkillsList.vue'

export default {
  name: 'Settings',

  components: {
    ProviderList,
    ModelList,
    SkillsList,
  },

  data() {
    return {
      activeTab: 'providers',
      tabs: [
        { name: 'providers', label: 'AI 服务商', icon: 'fa-solid fa-server' },
        { name: 'models', label: '模型', icon: 'fa-solid fa-brain' },
        { name: 'skills', label: 'Skills', icon: 'fa-solid fa-shapes' },
        { name: 'advanced', label: '高级', icon: 'fa-solid fa-gear' },
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
    }
  },

  created() {
    this.loadProviders()
    this.loadModels()
    this.loadSkills()
    this.loadConfig()
  },

  methods: {
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
        console.error('加载技能失败:', e)
        this.skills = []
      }
    },

    async loadConfig() {
      try {
        const res = await this.$api.getConfig('ai.maxToolIterations')
        if (res.data?.value) {
          this.config.maxToolIterations = parseInt(res.data.value)
        }
      } catch (e) {
      }
    },

    async setDefaultProvider(id) {
      try {
        await this.$api.setDefaultProvider(id)
        this.defaultProviderId = id
        this.$message.success('已设置为默认提供商')
        await this.loadProviders()
      } catch (e) {
        this.$message.error('设置失败: ' + e.message)
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
  },
}
</script>

<style scoped>
.advanced-form {
  max-width: 500px;
  margin-top: 20px;
}
</style>
