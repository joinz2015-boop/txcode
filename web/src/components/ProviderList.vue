<template>
  <div class="provider-list">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl text-white">AI 服务商 & 模型</h3>
      <div class="flex gap-2">
        <el-button size="small" @click="$emit('export-config')">
          <i class="fa-solid fa-download mr-1"></i>导出配置
        </el-button>
        <el-button size="small" @click="$emit('import-config')">
          <i class="fa-solid fa-upload mr-1"></i>导入配置
        </el-button>
        <el-button type="primary" size="small" @click="$emit('add-provider')">+ 添加服务商</el-button>
      </div>
    </div>

    <div class="providers">
      <!-- 官方服务商（硬编码，始终显示） -->
      <div class="provider-item official-provider">
        <div class="provider-main" @click="toggleProvider('songbing-official')">
          <span class="expand-icon" :class="{ expanded: expandedProviders.includes('songbing-official') }">▶</span>
          <div class="provider-logo official-logo">S</div>
          <div class="provider-info">
            <div class="provider-name">
              松饼AI
              <el-tag type="warning" size="mini">官方</el-tag>
              <el-tag v-if="songbingProvider" type="success" size="mini">已认证</el-tag>
            </div>
            <div class="provider-url">{{ songbingBaseUrl }}</div>
          </div>
          <div class="provider-actions">
            <el-button type="warning" size="small" @click.stop="$emit('auth-songbing')">
              {{ songbingProvider ? '重新认证' : '认证' }}
            </el-button>
            <el-button type="primary" size="small" @click.stop="$emit('sync-songbing-models')">
              同步模型
            </el-button>
          </div>
        </div>

        <div class="models-panel" :class="{ expanded: expandedProviders.includes('songbing-official') }">
          <div class="model-item" v-for="model in songbingModels" :key="model.id">
            <span class="model-name">{{ model.name }}</span>
            <el-tag v-if="model.enabled" type="success" size="mini">启用</el-tag>
            <el-tag v-else type="info" size="mini">禁用</el-tag>
          </div>
          <div v-if="songbingModels.length === 0" class="empty-models">
            暂无模型，请先认证后同步
          </div>
        </div>
      </div>

      <div
        v-for="provider in nonOfficialProviders"
        :key="provider.id"
        class="provider-item"
      >
        <div class="provider-main" @click="toggleProvider(provider.id)">
          <span class="expand-icon" :class="{ expanded: expandedProviders.includes(provider.id) }">▶</span>
          <div class="provider-logo">{{ provider.name.charAt(0).toUpperCase() }}</div>
          <div class="provider-info">
            <div class="provider-name">
              {{ provider.name }}
              <el-tag v-if="provider.isDefault" type="success" size="mini">默认</el-tag>
            </div>
            <div class="provider-url">{{ provider.baseUrl }}</div>
          </div>
          <div class="provider-actions">
            <el-button type="text" size="small" @click.stop="$emit('edit-provider', provider)">修改</el-button>
            <el-button type="text" size="small" class="delete-btn" @click.stop="$emit('delete-provider', provider.id)">删除</el-button>
          </div>
        </div>

        <div class="models-panel" :class="{ expanded: expandedProviders.includes(provider.id) }">
          <div class="models-header">
            <span class="models-title">模型列表</span>
            <el-button type="primary" size="mini" @click.stop="$emit('add-model', provider.id)">+ 添加模型</el-button>
          </div>
          <div class="model-item" v-for="model in getModelsByProvider(provider.id)" :key="model.id">
            <span class="model-name">{{ model.name }}</span>
            <el-tag v-if="model.enabled" type="success" size="mini">启用</el-tag>
            <el-tag v-else type="info" size="mini">禁用</el-tag>
            <div class="model-actions">
              <el-button type="text" size="small" @click.stop="$emit('edit-model', model)">修改</el-button>
              <el-button type="text" size="small" class="delete-btn" @click.stop="$emit('delete-model', model.id)">删除</el-button>
            </div>
          </div>
          <div v-if="getModelsByProvider(provider.id).length === 0" class="empty-models">
            暂无模型
          </div>
        </div>
      </div>

      <div v-if="nonOfficialProviders.length === 0" class="empty">
        暂无服务商
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProviderList',

  props: {
    providers: {
      type: Array,
      default: () => [],
    },
    models: {
      type: Array,
      default: () => [],
    },
    songbingProvider: {
      type: Object,
      default: null,
    },
  },

  emits: ['add-provider', 'edit-provider', 'delete-provider', 'add-model', 'edit-model', 'delete-model', 'export-config', 'import-config', 'auth-songbing', 'sync-songbing-models'],

  data() {
    return {
      expandedProviders: [],
    }
  },

  computed: {
    nonOfficialProviders() {
      return this.providers.filter(p => p.name !== '松饼AI');
    },
    songbingModels() {
      if (!this.songbingProvider) return [];
      return this.models.filter(m => m.providerId === this.songbingProvider.id);
    },
    songbingBaseUrl() {
      return this.songbingProvider?.baseUrl || 'https://ai.songbingcloud.com/api/v1';
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
  },
}
</script>

<style scoped>
.providers {
  padding: 10px 0;
}

.provider-item {
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}

.provider-main {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.provider-main:hover {
  background: rgba(255,255,255,0.03);
}

.expand-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  margin-right: 8px;
  color: #666;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.provider-logo {
  width: 40px;
  height: 40px;
  background: #3a3a3a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  margin-right: 12px;
  color: #fff;
}

.provider-info {
  flex: 1;
}

.provider-name {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-url {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.provider-actions {
  display: flex;
  gap: 8px;
}

.delete-btn {
  color: #f56c6c !important;
}

.models-panel {
  display: none;
  padding: 16px;
  background: rgba(0,0,0,0.2);
}

.models-panel.expanded {
  display: block;
}

.models-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.models-title {
  font-size: 14px;
  color: #999;
}

.model-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  margin-bottom: 8px;
}

.model-item:hover {
  border-color: #1890ff;
}

.model-name {
  flex: 1;
  font-size: 14px;
  color: #fff;
}

.model-actions {
  display: flex;
  gap: 6px;
  margin-left: 12px;
}

.empty-models {
  text-align: center;
  color: #666;
  padding: 20px;
}

.empty {
  text-align: center;
  color: #666;
  padding: 40px;
}
</style>
