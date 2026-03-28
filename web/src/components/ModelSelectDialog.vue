<template>
  <el-dialog
    :visible.sync="visible"
    title="选择模型"
    width="400px"
    @close="handleClose"
  >
    <div class="model-list">
      <div
        v-for="model in models"
        :key="model.id"
        class="model-item"
        :class="{ active: selectedModelName === model.name }"
        @click="handleSelect(model)"
      >
        <span class="model-name">{{ model.name }}</span>
        <span class="model-provider">{{ model.providerId }}</span>
      </div>
      <div v-if="loading" class="empty-models">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
      <div v-else-if="models.length === 0" class="empty-models">
        暂无可用模型
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { api } from '../api'

export default {
  name: 'ModelSelectDialog',
  props: {
    visible: { type: Boolean, default: false },
    currentModel: { type: String, default: '' }
  },
  data() {
    return {
      models: [],
      loading: false
    }
  },
  computed: {
    selectedModelName() {
      return this.currentModel
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadModels()
      }
    }
  },
  methods: {
    async loadModels() {
      this.loading = true
      try {
        const res = await api.getModels()
        this.models = res.data || []
      } catch (e) {
        console.error('加载模型列表失败:', e)
        this.models = []
      } finally {
        this.loading = false
      }
    },
    handleSelect(model) {
      this.$emit('select', model)
      this.visible = false
    },
    handleClose() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.model-list { max-height: 400px; overflow-y: auto; }
.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.model-item:hover { background: #27272a; }
.model-item.active { background: #3b82f6; }
.model-name { color: #d4d4d8; font-weight: 500; }
.model-item.active .model-name { color: #fff; }
.model-provider { color: #84848a; font-size: 12px; }
.model-item.active .model-provider { color: #e0e0e0; }
.empty-models { padding: 20px; text-align: center; color: #71717a; }

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
</style>
