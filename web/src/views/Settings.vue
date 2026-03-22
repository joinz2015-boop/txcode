<template>
  <div class="settings-page">
    <div class="settings-header">
      <el-button icon="el-icon-back" @click="goBack">返回</el-button>
      <h2>设置</h2>
    </div>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="AI 服务商" name="providers">
        <ProviderList
          :providers="providers"
          :default-provider-id="defaultProviderId"
          @refresh="loadProviders"
          @set-default="setDefaultProvider"
        />
      </el-tab-pane>

      <el-tab-pane label="模型" name="models">
        <ModelList
          :models="models"
          :providers="providers"
          @refresh="loadModels"
        />
      </el-tab-pane>

      <el-tab-pane label="Skills" name="skills">
        <SkillsList :skills="skills" />
      </el-tab-pane>

      <el-tab-pane label="高级" name="advanced">
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
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import ProviderList from '../components/ProviderList.vue';
import ModelList from '../components/ModelList.vue';
import SkillsList from '../components/SkillsList.vue';

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
      providers: [],
      models: [],
      skills: [],
      defaultProviderId: null,
      config: {
        maxToolIterations: 10,
        maxSessionCompression: 5,
        webPort: 40000,
      },
    };
  },

  created() {
    this.loadProviders();
    this.loadModels();
    this.loadSkills();
    this.loadConfig();
  },

  methods: {
    async loadProviders() {
      try {
        const res = await this.$api.getProviders();
        this.providers = res.data || [];
        const defaultProvider = this.providers.find(p => p.isDefault);
        this.defaultProviderId = defaultProvider?.id || null;
      } catch (e) {
        this.$message.error('加载提供商失败: ' + e.message);
      }
    },

    async loadModels() {
      try {
        const res = await this.$api.getModels();
        this.models = res.data || [];
      } catch (e) {
        this.$message.error('加载模型失败: ' + e.message);
      }
    },

    async loadSkills() {
      try {
        const res = await this.$api.getSkills();
        this.skills = res.data || [];
      } catch (e) {
        console.error('加载技能失败:', e);
        this.skills = [];
      }
    },

    async loadConfig() {
      try {
        const res = await this.$api.getConfig('ai.maxToolIterations');
        if (res.data?.value) {
          this.config.maxToolIterations = parseInt(res.data.value);
        }
      } catch (e) {
      }
    },

    async setDefaultProvider(id) {
      try {
        await this.$api.setDefaultProvider(id);
        this.defaultProviderId = id;
        this.$message.success('已设置为默认提供商');
        await this.loadProviders();
      } catch (e) {
        this.$message.error('设置失败: ' + e.message);
      }
    },

    async saveConfig(key, value) {
      try {
        await this.$api.setConfig(key, value);
        this.$message.success('配置已保存');
      } catch (e) {
        this.$message.error('保存失败: ' + e.message);
      }
    },

    goBack() {
      this.$router.go(-1);
    },
  },
};
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.settings-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.settings-header h2 {
  margin: 0 0 0 20px;
}

.advanced-form {
  max-width: 500px;
  margin-top: 20px;
}
</style>
