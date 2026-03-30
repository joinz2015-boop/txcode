<template>
  <div class="step1-container">
    <div class="step1-main">
      <div class="panel-section">
        <div class="panel-section-header">
          <span><i class="el-icon-folder-add"></i> 创建新需求</span>
        </div>
        <div class="panel-section-body">
          <el-form label-position="top" size="small">
            <el-form-item label="所属大类">
              <div class="flex gap-2">
                <el-select v-model="selectedCategory" placeholder="请选择大类" style="flex: 1;" @change="onCategoryChange">
                  <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat"></el-option>
                </el-select>
                <el-button @click="showCreateCategoryDialog">
                  <i class="el-icon-plus"></i> 新建
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="选择需求">
              <div class="flex gap-2">
                <el-select
                  v-model="selectedProject"
                  placeholder="选择已有需求目录"
                  style="flex: 1;"
                  :disabled="!selectedCategory"
                  @change="onProjectChange"
                >
                  <el-option v-for="req in existingRequirementList" :key="req" :label="req" :value="req"></el-option>
                </el-select>
                <el-button @click="showCreateRequirementDialog" :disabled="!selectedCategory">
                  <i class="el-icon-plus"></i> 新建
                </el-button>
              </div>
            </el-form-item>
            <div class="form-hint" style="color: #84848a;">
              {{ selectedCategory ? '可直接选择已有需求，或点击“新建”创建需求目录' : '请先选择大类' }}
            </div>
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

    <el-dialog
      title="新建需求"
      :visible.sync="requirementDialogVisible"
      width="400px"
    >
      <el-form>
        <el-form-item label="需求目录名称">
          <el-input v-model="requirementDialogInput" placeholder="输入需求名称，如：用户管理"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="requirementDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateRequirementConfirm">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Step1NewReq',
  props: {
    categories: {
      type: Array,
      default: () => []
    },
    projects: {
      type: Object,
      default: () => ({})
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
      selectedProject: '',
      dialogVisible: false,
      dialogInput: '',
      requirementDialogVisible: false,
      requirementDialogInput: ''
    }
  },
  computed: {
    existingRequirementList() {
      if (!this.selectedCategory) return []
      const prefix = `${this.selectedCategory}/`
      return Object.keys(this.projects)
        .filter(key => key.startsWith(prefix))
        .map(key => key.split('/')[1])
        .sort()
    }
  },
  watch: {
    currentCategory: {
      immediate: true,
      handler(val) {
        this.selectedCategory = val || ''
      }
    },
    currentProject: {
      immediate: true,
      handler(val) {
        this.selectedProject = val || ''
      }
    },
    selectedCategory(val) {
      if (!val) {
        this.selectedProject = ''
      }
    },
    existingRequirementList(list) {
      if (!this.selectedProject) return
      if (!Array.isArray(list) || list.length === 0) return
      if (!list.includes(this.selectedProject)) {
        this.selectedProject = ''
      }
    }
  },
  methods: {
    onCategoryChange() {
      this.selectedProject = ''
      this.$emit('category-change', this.selectedCategory || '')
      this.$emit('project-change', '')
    },
    onProjectChange() {
      this.$emit('project-change', this.selectedProject || '')
    },
    showCreateRequirementDialog() {
      if (!this.selectedCategory) {
        this.$message.warning('请先选择大类')
        return
      }
      this.requirementDialogInput = ''
      this.requirementDialogVisible = true
    },
    handleCreateRequirementConfirm() {
      const name = this.requirementDialogInput.trim()
      if (!name) {
        this.$message.warning('需求名称不能为空')
        return
      }
      if (this.existingRequirementList.includes(name)) {
        this.$message.warning('该需求已存在')
        return
      }
      this.$emit('create-requirement', {
        category: this.selectedCategory,
        name
      })
      this.requirementDialogVisible = false
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
