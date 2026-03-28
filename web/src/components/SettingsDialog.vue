<template>
  <el-dialog
    title="设置"
    :visible="visible"
    width="800px"
    @close="$emit('close')"
    class="settings-dialog"
  >
    <el-tabs v-model="activeTab">
      <!-- AI 服务商配置 -->
      <el-tab-pane label="AI 服务商" name="providers">
        <ProviderList
          :providers="providers"
          :default-provider-id="defaultProviderId"
          @refresh="loadProviders"
          @set-default="setDefaultProvider"
        />
      </el-tab-pane>

      <!-- 模型配置 -->
      <el-tab-pane label="模型" name="models">
        <ModelList
          :models="models"
          :providers="providers"
          @refresh="loadModels"
        />
      </el-tab-pane>

      <!-- 技能配置 -->
      <el-tab-pane label="Skills" name="skills">
        <SkillsList :skills="skills" />
      </el-tab-pane>

      <!-- 高级配置 -->
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
  </el-dialog>
</template>

<script>
import ProviderList from './ProviderList.vue';
import ModelList from './ModelList.vue';
import SkillsList from './SkillsList.vue';

/**
 * SettingsDialog 组件
 * 
 * 设置弹窗，包含：
 * - AI 服务商管理
 * - 模型管理
 * - 技能查看
 * - 高级配置
 */
export default {
  name: 'SettingsDialog',

  components: {
    ProviderList,
    ModelList,
    SkillsList,
  },

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
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

  watch: {
    visible(val) {
      if (val) {
        this.loadProviders();
        this.loadModels();
        this.loadSkills();
        this.loadConfig();
      }
    },
  },

  methods: {
    /**
     * 加载提供商列表
     */
    async loadProviders() {
      try {
        const res = await this.$api.getProviders();
        this.providers = res.data || [];
        // 找到默认提供商
        const defaultProvider = this.providers.find(p => p.isDefault);
        this.defaultProviderId = defaultProvider?.id || null;
      } catch (e) {
        this.$message.error('加载提供商失败: ' + e.message);
      }
    },

    /**
     * 加载模型列表
     */
    async loadModels() {
      try {
        const res = await this.$api.getModels();
        this.models = res.data || [];
      } catch (e) {
        this.$message.error('加载模型失败: ' + e.message);
      }
    },

    /**
     * 加载技能列表
     */
    async loadSkills() {
      try {
        const res = await this.$api.getSkills();
        this.skills = res.data || [];
      } catch (e) {
        console.error('加载技能失败:', e);
        this.skills = [];
      }
    },

    /**
     * 加载配置
     */
    async loadConfig() {
      try {
        const res = await this.$api.getConfig('ai.maxToolIterations');
        if (res.data?.value) {
          this.config.maxToolIterations = parseInt(res.data.value);
        }
      } catch (e) {
        // 使用默认值
      }
    },

    /**
     * 设置默认提供商
     */
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

    /**
     * 保存配置
     */
    async saveConfig(key, value) {
      try {
        await this.$api.setConfig(key, value);
        this.$message.success('配置已保存');
      } catch (e) {
        this.$message.error('保存失败: ' + e.message);
      }
    },
  },
};
</script>

<style scoped>
.settings-dialog >>> .el-dialog__body {
  padding: 10px 20px;
}

.advanced-form {
  max-width: 500px;
  margin-top: 20px;
}

:deep(.el-dialog) {
  background: #18181b;
  border: 1px solid #3f3f46;
}
:deep(.el-dialog__header) {
  background: #18181b;
  border-bottom: 1px solid #3f3f46;
  padding: 16px 20px;
}
:deep(.el-dialog__title) {
  color: #d4d4d8;
  font-size: 15px;
  font-weight: 500;
}
:deep(.el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}
:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #71717a;
}
:deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #fff;
}
:deep(.el-dialog__body) {
  background: #18181b;
  padding: 20px;
  color: #d4d4d8;
}
:deep(.el-tabs__header) {
  background: #18181b;
  border-bottom: 1px solid #3f3f46;
  margin: 0;
}
:deep(.el-tabs__nav-wrap::after) {
  background: #3f3f46;
}
:deep(.el-tabs__item) {
  color: #71717a;
}
:deep(.el-tabs__item:hover) {
  color: #d4d4d8;
}
:deep(.el-tabs__item.is-active) {
  color: #3b82f6;
}
:deep(.el-tabs__active-bar) {
  background: #3b82f6;
}
:deep(.el-form-item__label) {
  color: #a1a1aa;
}
:deep(.el-input-number) {
  width: 100%;
}
:deep(.el-input__inner) {
  background: #27272a;
  border-color: #3f3f46;
  color: #d4d4d8;
}
:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  background: #27272a;
  border-color: #3f3f46;
  color: #a1a1aa;
}
</style>
