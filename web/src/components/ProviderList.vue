<template>
  <div class="provider-list">
    <!-- 提供商列表 -->
    <div class="list">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="provider-item"
      >
        <div class="provider-info">
          <div class="provider-name">
            {{ provider.name }}
            <el-tag v-if="provider.isDefault" type="success" size="mini">默认</el-tag>
          </div>
          <div class="provider-url">{{ provider.baseUrl }}</div>
        </div>
        <div class="provider-actions">
          <el-button
            v-if="!provider.isDefault"
            type="text"
            size="small"
            @click="$emit('set-default', provider.id)"
          >
            设为默认
          </el-button>
          <el-button
            type="text"
            size="small"
            @click="editProvider(provider)"
          >
            编辑
          </el-button>
          <el-button
            type="text"
            size="small"
            class="delete-btn"
            @click="deleteProvider(provider.id)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加按钮 -->
    <el-button
      type="primary"
      size="small"
      icon="el-icon-plus"
      @click="showAddDialog = true"
      class="add-btn"
    >
      添加服务商
    </el-button>

    <!-- 添加/编辑弹窗 -->
    <el-dialog
      :title="editingProvider ? '编辑服务商' : '添加服务商'"
      :visible="showAddDialog"
      width="500px"
      @close="closeDialog"
    >
      <el-form :model="form" :rules="rules" ref="form" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: OpenAI" />
        </el-form-item>

        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            placeholder="sk-..."
          />
        </el-form-item>

        <el-form-item label="Base URL" prop="baseUrl">
          <el-input
            v-model="form.baseUrl"
            placeholder="https://api.openai.com/v1"
          />
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
 * ProviderList 组件
 * 
 * AI 服务商列表管理
 * - 显示所有服务商
 * - 支持添加、编辑、删除
 * - 设置默认服务商
 */
export default {
  name: 'ProviderList',

  props: {
    providers: {
      type: Array,
      default: () => [],
    },
    defaultProviderId: {
      type: String,
      default: null,
    },
  },

  data() {
    return {
      showAddDialog: false,
      editingProvider: null,
      form: {
        name: '',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
      },
    };
  },

  methods: {
    /**
     * 编辑提供商
     */
    editProvider(provider) {
      this.editingProvider = provider;
      this.form = {
        name: provider.name,
        apiKey: '',
        baseUrl: provider.baseUrl || 'https://api.openai.com/v1',
      };
      this.showAddDialog = true;
    },

    /**
     * 删除提供商
     */
    async deleteProvider(id) {
      try {
        await this.$confirm('确定要删除该服务商吗？', '提示', {
          type: 'warning',
        });
        await this.$api.deleteProvider(id);
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
        if (this.editingProvider) {
          // 更新
          const updateData = {
            name: this.form.name,
            baseUrl: this.form.baseUrl,
          };
          if (this.form.apiKey) {
            updateData.apiKey = this.form.apiKey;
          }
          await this.$api.updateProvider(this.editingProvider.id, updateData);
          this.$message.success('更新成功');
        } else {
          // 新增
          await this.$api.addProvider(this.form);
          this.$message.success('添加成功');
        }
        this.closeDialog();
        this.$emit('refresh');
      } catch (e) {
        this.$message.error('保存失败: ' + e.message);
      }
    },

    /**
     * 关闭弹窗
     */
    closeDialog() {
      this.showAddDialog = false;
      this.editingProvider = null;
      this.form = {
        name: '',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
      };
      this.$refs.form?.resetFields();
    },
  },
};
</script>

<style scoped>
.provider-list {
  padding: 10px 0;
}

.list {
  margin-bottom: 20px;
}

.provider-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 10px;
}

.provider-name {
  font-weight: bold;
  font-size: 14px;
}

.provider-url {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.provider-actions {
  display: flex;
  gap: 10px;
}

.delete-btn {
  color: #f56c6c;
}

.add-btn {
  width: 100%;
}
</style>
