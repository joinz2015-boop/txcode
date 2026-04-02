<template>
  <div class="dev-workflow-view">
    <WorkflowSidebar
      ref="sidebar"
      :categories="categories"
      :projects="projects"
      :current-category="currentCategory"
      :current-project="currentProject"
      :current-step="currentStep"
      :is-loading="isLoadingProjects"
      @category-change="onCategoryChange"
      @project-change="onProjectChange"
      @step-change="onStepChange"
      @delete-category="deleteCategory"
      @rename-category="renameCategory"
    />

    <div class="main-content">
      <div class="panel-header">
        <span class="panel-title">{{ stepTitle }}</span>
        <div class="panel-actions">
          <template v-if="currentStep === 2">
            <el-button type="primary" plain @click="saveSpec">
              <i class="el-icon-save"></i> 保存方案
            </el-button>
            <el-button type="info" plain @click="refreshSpec">
              <i class="el-icon-refresh"></i> 刷新方案
            </el-button>
          </template>
        </div>
      </div>

      <div class="step-content">
        <Step1NewReq
          v-show="currentStep === 1"
          :categories="categories"
          :projects="projects"
          :base-path="reqBasePath"
          :current-category="currentCategory"
          :current-project="currentProject"
          @category-change="onCategoryChange"
          @project-change="onProjectChange"
          @create-category="createCategory"
          @create-requirement="createRequirement"
        />

        <Step2Design
          v-if="currentStep === 2 && hasSelectedProject"
          :category="currentCategory"
          :name="currentProject"
          :req-base-path="reqBasePath"
          @update:sessionId="updateDesignSessionId"
          @save-spec="onSaveSpec"
          @spec-updated="refreshSpec"
          ref="step2Ref"
        />

        <Step3CodeGen
          v-if="currentStep === 3 && hasSelectedProject"
          :category="currentCategory"
          :name="currentProject"
          :req-base-path="reqBasePath"
          @update:sessionId="updateCodeSessionId"
          ref="step3Ref"
        />

        <Step4Test
          v-if="currentStep === 4 && hasSelectedProject"
          :category="currentCategory"
          :name="currentProject"
          :req-base-path="reqBasePath"
          @update:sessionId="updateTestSessionId"
          ref="step4Ref"
        />
      </div>

      <div class="status-bar">
        <span>
          <i class="el-icon-info"></i>
          {{ statusText }}
        </span>
        <span>{{ projectKey || '未选择项目' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import WorkflowSidebar from '../components/WorkflowSidebar.vue'
import Step1NewReq from '../components/Step1NewReq.vue'
import Step2Design from '../components/Step2Design.vue'
import Step3CodeGen from '../components/Step3CodeGen.vue'
import Step4Test from '../components/Step4Test.vue'
import { api } from '../api'

export default {
  name: 'DevWorkflowView',
  components: {
    WorkflowSidebar,
    Step1NewReq,
    Step2Design,
    Step3CodeGen,
    Step4Test
  },
  props: {
    sidebarVisible: { type: Boolean, default: true }
  },
  data() {
    return {
      currentCategory: '',
      currentProject: '',
      currentStep: 1,
      categories: [],
      projects: {},
      reqBasePath: '',
      isLoadingProjects: false
    }
  },
  computed: {
    projectKey() {
      if (!this.currentCategory || !this.currentProject) return ''
      return `${this.currentCategory}/${this.currentProject}`
    },
    hasSelectedProject() {
      return !!this.currentProject
    },
    stepTitle() {
      const titles = {
        1: '新建需求',
        2: '方案设计',
        3: '代码生成',
        4: '测试验收'
      }
      return titles[this.currentStep] || ''
    },
    statusText() {
      if (this.projectKey) {
        return `步骤 ${this.currentStep} / 4`
      }
      return '就绪'
    }
  },
  created() {
    this.loadState()
    this.loadCategories()
  },
  methods: {
    async loadState() {
      try {
        const res = await api.getWorkflowState()
        const state = res.data
        if (state) {
          this.currentCategory = state.currentCategory || ''
          this.currentProject = state.currentProject || ''
          this.currentStep = state.currentStep || 1
        }
      } catch (e) {
        console.error('Load workflow state failed:', e)
      }
    },
    async saveState() {
      try {
        await api.updateWorkflowState(this.currentCategory, this.currentProject, this.currentStep)
      } catch (e) {
        console.error('Save workflow state failed:', e)
      }
    },
    async loadCategories() {
      try {
        const cwdRes = await api.getCwd()
        this.reqBasePath = cwdRes.data?.basePath || ''
        
        const res = await api.browseFilesystem(this.reqBasePath)
        const items = res.data?.items || []
        this.categories = items
          .filter(item => item.is_directory)
          .map(item => item.name)
        this.categories.sort()

        if (this.currentCategory && this.categories.includes(this.currentCategory)) {
          await this.loadProjectsForCategory(this.currentCategory)
        }
      } catch (e) {
        console.error('Load categories failed:', e)
        this.categories = []
      }
    },
    async loadProjectsForCategory(category) {
      if (!category) return
      this.isLoadingProjects = true
      try {
        const catPath = `${this.reqBasePath}\\${category}`
        const res = await api.browseFilesystem(catPath)
        const items = res.data?.items || []
        this.projects = {}
        items.filter(item => item.is_directory).forEach(item => {
          const key = `${category}/${item.name}`
          this.projects[key] = { name: item.name, stepStatus: {} }
        })
      } catch (e) {
        console.error('Load projects failed:', e)
      } finally {
        this.isLoadingProjects = false
      }
    },
    async onCategoryChange(cat) {
      this.currentCategory = cat
      this.currentProject = ''
      this.currentStep = 1
      if (cat) {
        await this.loadProjectsForCategory(cat)
      } else {
        this.projects = {}
      }
    },
    onProjectChange(proj) {
      this.currentProject = proj
      if (!this.currentProject && this.currentStep > 1) {
        this.currentStep = 1
      }
    },
    onStepChange(step) {
      if (!this.currentProject && step > 1) {
        return
      }
      this.currentStep = step
    },
    async createCategory(name) {
      if (this.categories.includes(name)) {
        this.$message.warning('大类已存在')
        return
      }
      try {
        const newPath = `${this.reqBasePath}\\${name}`
        await api.createDirectory(newPath)
        this.categories.push(name)
        this.categories.sort()
        this.$message.success(`大类「${name}」创建成功`)
      } catch (e) {
        console.error('Create category failed:', e)
        this.$message.error('创建大类失败')
      }
    },
    async renameCategory({ oldName, newName }) {
      if (this.categories.includes(newName)) {
        this.$message.warning('名称已存在')
        return
      }
      try {
        const oldPath = `${this.reqBasePath}\\${oldName}`
        await api.renameFile(oldPath, newName)
        
        const index = this.categories.indexOf(oldName)
        if (index > -1) {
          this.categories[index] = newName
        }
        this.categories.sort()

        if (this.currentCategory === oldName) {
          this.currentCategory = newName
          await this.loadProjectsForCategory(newName)
        }
        await this.saveState()
        this.$message.success(`已重命名为「${newName}」`)
      } catch (e) {
        console.error('Rename category failed:', e)
        this.$message.error('重命名大类失败')
      }
    },
    async deleteCategory(catName) {
      try {
        const deletePath = `${this.reqBasePath}\\${catName}`
        await api.deleteFile(deletePath)

        this.categories = this.categories.filter(c => c !== catName)

        if (this.currentCategory === catName) {
          this.currentCategory = ''
          this.currentProject = ''
          this.currentStep = 1
          this.projects = {}
        }
        await this.saveState()
        this.$message.success(`大类「${catName}」已删除`)
      } catch (e) {
        console.error('Delete category failed:', e)
        this.$message.error('删除大类失败')
      }
    },
    async createRequirement({ category, name }) {
      if (this.projects[name]) {
        this.$message.warning('需求已存在')
        return
      }

      try {
        const reqDirPath = `${this.reqBasePath}\\${category}\\${name}`
        await api.createDirectory(reqDirPath)
      } catch (e) {
        console.error('Create requirement directory failed:', e)
      }

      const specContent = `# ${name}方案

> 所属大类：${category}

## 业务目标

## 功能点

`

      try {
        const specPath = `${this.reqBasePath}\\${category}\\${name}\\${name}_方案.md`
        await api.writeFile(specPath, specContent)
      } catch (e) {
        console.error('Write spec file failed:', e)
      }

      const key = `${category}/${name}`
      this.$set(this.projects, key, { name, stepStatus: {} })
      this.currentCategory = category
      this.currentProject = name
      this.$message.success(`需求「${name}」创建成功`)
      this.$nextTick(() => {
        this.currentStep = 2
      })
    },
    async onSaveSpec(content) {
      if (!this.projectKey) return
      const specPath = `${this.reqBasePath}\\${this.currentCategory}\\${this.currentProject}\\${this.currentProject}_方案.md`
      try {
        await api.writeFile(specPath, content)
        this.$message.success('方案已保存')
      } catch (e) {
        console.error('Save spec failed:', e)
        this.$message.error('保存方案失败')
      }
    },
    saveSpec() {
      if (this.$refs.step2Ref) {
        this.$refs.step2Ref.saveSpec()
      }
    },
    async refreshSpec() {
      if (this.$refs.step2Ref?.loadSpec) {
        await this.$refs.step2Ref.loadSpec()
      }
      this.$message.success('方案已刷新')
    }
  }
}
</script>

<style scoped>
.dev-workflow-view {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #0a0a09;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  background: #121212;
  border-bottom: 1px solid #1e1e1e;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 500;
  color: #f4f4f5;
}

.panel-actions {
  display: flex;
  gap: 12px;
}

.step-content {
  flex: 1;
  overflow: hidden;
}

.status-bar {
  background: #121212;
  border-top: 1px solid #1e1e1e;
  padding: 8px 24px;
  font-size: 12px;
  color: #84848a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
</style>
