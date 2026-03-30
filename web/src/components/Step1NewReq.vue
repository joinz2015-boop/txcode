<template>
  <div class="step1-container">
    <div class="step1-main">
      <div class="panel-section">
        <div class="panel-section-header">
          <span><i class="el-icon-folder-add"></i> 创建新需求</span>
          <el-button v-if="isExistingMode" type="text" @click="resetNewMode" style="color: #409EFF;">
            <i class="el-icon-refresh"></i> 重新新建
          </el-button>
        </div>
        <div class="panel-section-body">
          <el-form label-position="top" size="small">
            <el-form-item label="所属大类">
              <div class="flex gap-2">
                <el-select v-model="selectedCategory" placeholder="请选择大类" style="flex: 1;" :disabled="isExistingMode">
                  <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat"></el-option>
                </el-select>
                <el-button @click="showCreateCategoryDialog" :disabled="isExistingMode">
                  <i class="el-icon-plus"></i> 新建
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="需求目录名称">
              <el-input
                v-model="requirementName"
                placeholder="输入需求名称，如：用户管理"
                :disabled="isExistingMode"
              ></el-input>
            </el-form-item>
            <div class="form-hint" v-if="isExistingMode" style="color: #E6A23C;">
              <i class="el-icon-warning"></i> 需求文件已存在，大类和需求目录已锁定。如需创建新需求，请点击"重新新建"。
            </div>
            <div class="form-hint" v-else-if="selectedCategory && requirementName">
              将在 <code>{{ basePath }}\{{ selectedCategory }}\{{ requirementName }}\</code> 下创建
            </div>
            <div class="form-hint" v-else style="color: #84848a;">
              {{ selectedCategory && !requirementName ? '请输入需求名称' : '请选择大类并输入需求名称' }}
            </div>
            <el-button type="primary" @click="createRequirement" :disabled="!canCreate || isExistingMode" style="margin-top: 16px;">
              <i class="el-icon-check"></i> 确定创建
            </el-button>
          </el-form>
        </div>
      </div>
    </div>

    <el-dialog
      title="新建大类"
      :visible.sync="dialogVisible"
      width="400px"
    >
      <el-form>
        <el-form-item label="大类名称">
          <el-input v-model="dialogInput" placeholder="输入大类名称"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'Step1NewReq',
  props: {
    categories: {
      type: Array,
      default: () => []
    },
    basePath: {
      type: String,
      default: 'E:\\ai\\txcode\\.txcode\\req'
    },
    currentCategory: {
      type: String,
      default: ''
    },
    currentProject: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      selectedCategory: '',
      requirementName: '',
      dialogVisible: false,
      dialogInput: '',
      isExistingMode: false
    }
  },
  computed: {
    canCreate() {
      return this.selectedCategory && this.requirementName.trim()
    }
  },
  watch: {
    selectedCategory(val) {
      this.$emit('category-change', val)
    },
    currentCategory(val) {
      if (val) {
        this.selectedCategory = val
        this.checkExistingRequirement()
      }
    },
    currentProject(val) {
      if (val) {
        this.requirementName = val
        this.checkExistingRequirement()
      }
    }
  },
  methods: {
    async checkExistingRequirement() {
      if (!this.selectedCategory || !this.requirementName) {
        this.isExistingMode = false
        return
      }
      const reqPath = `${this.basePath}\\${this.selectedCategory}\\${this.requirementName}`
      try {
        await api.browseFilesystem(reqPath)
        this.isExistingMode = true
      } catch (e) {
        this.isExistingMode = false
      }
    },
    resetNewMode() {
      this.isExistingMode = false
      this.selectedCategory = ''
      this.requirementName = ''
      this.$emit('category-change', '')
    },
    createRequirement() {
      if (!this.canCreate) return
      this.$emit('create-requirement', {
        category: this.selectedCategory,
        name: this.requirementName.trim()
      })
      this.requirementName = ''
      this.isExistingMode = false
    },
    showCreateCategoryDialog() {
      this.dialogInput = ''
      this.dialogVisible = true
    },
    handleDialogConfirm() {
      const value = this.dialogInput.trim()
      if (!value) {
        this.$message.warning('名称不能为空')
        return
      }
      this.$emit('create-category', value)
      this.dialogVisible = false
    }
  }
}
</script>

<style scoped>
.step1-container {
  height: 100%;
  padding: 24px;
  overflow: hidden;
}

.step1-main {
  max-width: 600px;
  margin: 0 auto;
}

.panel-section {
  background: #121212;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

  .panel-section-header {
    background: #121212;
    border-bottom: 1px solid #1e1e1e;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #f4f4f5;
  }

  .panel-section-header .el-button {
    padding: 4px 8px;
    font-size: 12px;
  }

.panel-section-body {
  padding: 24px;
}

.form-hint {
  font-size: 12px;
  color: #84848a;
  margin-top: 8px;
}

.form-hint code {
  background: #18191b;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  color: #409EFF;
}

.flex {
  display: flex;
}

.gap-2 {
  gap: 8px;
}
</style>
