<template>
  <div class="model-list">
    <!-- 按提供商筛选 -->
    <div class="filter" v-if="providers.length > 0">
      <span>筛选提供商：</span>
      <el-select v-model="selectedProviderId" placeholder="全部" clearable size="small">
        <el-option
          v-for="p in providers"
          :key="p.id"
          :label="p.name"
          :value="p.id"
        />
      </el-select>
    </div>

    <!-- 模型列表 -->
    <div class="list">
      <div
        v-for="model in filteredModels"
        :key="model.id"
        class="model-item"
      >
        <div class="model-info">
          <div class="model-name">{{ model.name }}</div>
          <div class="model-provider">{{ getProviderName(model.providerId) }}</div>
        </div>
        <div class="model-actions">
          <el-tag :type="model.enabled ? 'success' : 'info'" size="mini">
            {{ model.enabled ? '启用' : '禁用' }}
          </el-tag>
          <el-button
            type="text"
            size="small"
            class="delete-btn"
            @click="deleteModel(model.id)"
          >
            删除
          </el-button>
        </div>
      </div>

      <div v-if="filteredModels.length === 0" class="empty">
        暂无模型
      </div>
    </div>

    <!-- 添加模型按钮 -->
    <el-button
      type="primary"
      size="small"
      icon="el-icon-plus"
      @click="showAddDialog = true"
      class="add-btn"
    >
      添加模型
    </el-button>

    <!-- 添加模型弹窗 -->
    <el-dialog
      title="添加模型"
      :visible="showAddDialog"
      width="500px"
      @close="closeDialog"
    >
      <el-form :model="form" :rules="rules" ref="form" label-width="100px">
        <el-form-item label="所属提供商" prop="providerId">
          <el-select v-model="form.providerId" placeholder="选择提供商" style="width: 100%" @change="onProviderChange">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="模型名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: GPT-4" />
        </el-form-item>

        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>

      <span slot="footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
/**
 * ModelList 组件
 * 
 * 模型列表管理
 * - 显示所有模型
 * - 按提供商筛选
 * - 支持添加、删除模型
 */
export default {
  name: 'ModelList',

  props: {
    models: {
      type: Array,
      default: () => [],
    },
    providers: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      selectedProviderId: null,
      showAddDialog: false,
      form: {
        providerId: '',
        name: '',
        enabled: true,
      },
      rules: {
        providerId: [{ required: true, message: '请选择提供商', trigger: 'blur' }],
        name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
      },
    };
  },

  computed: {
    /**
     * 根据提供商筛选模型
     */
    filteredModels() {
      if (!this.selectedProviderId) {
        return this.models;
      }
      return this.models.filter(m => m.providerId === this.selectedProviderId);
    },
  },

  methods: {
    onProviderChange() {
      this.$refs.form?.validateField('providerId');
    },
    /**
     * 获取提供商名称
     */
    getProviderName(providerId) {
      const provider = this.providers.find(p => p.id === providerId);
      return provider?.name || providerId;
    },

    /**
     * 删除模型
     */
    async deleteModel(id) {
      try {
        await this.$confirm('确定要删除该模型吗？', '提示', {
          type: 'warning',
        });
        await this.$api.deleteModel(id);
        this.$message.success('删除成功');
        this.$emit('refresh');
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败: ' + e.message);
        }
      }
    },

    /**
     * 提交表单
     */
    async submit() {
      try {
        await this.$refs.form.validate();
      } catch (e) {
        return;
      }

      try {
        await this.$api.addModel(this.form);
        this.$message.success('添加成功');
        this.closeDialog();
        this.$emit('refresh');
      } catch (e) {
        this.$message.error('添加失败: ' + e.message);
      }
    },

    /**
     * 关闭弹窗
     */
    closeDialog() {
      this.showAddDialog = false;
      this.form = {
        providerId: '',
        name: '',
        enabled: true,
      };
      this.$refs.form?.resetFields();
    },
  },
};
</script>

<style scoped>
.model-list {
  padding: 10px 0;
}

.filter {
  margin-bottom: 15px;
}

.list {
  margin-bottom: 20px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 10px;
}

.model-name {
  font-weight: bold;
  font-size: 14px;
}

.model-provider {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.delete-btn {
  color: #f56c6c;
}

.empty {
  text-align: center;
  color: #909399;
  padding: 40px;
}

.add-btn {
  width: 100%;
}
</style>
