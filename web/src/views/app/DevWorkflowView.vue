<template>
  <div class="dev-workflow-view">
    <AppWorkflowStep
      :current-step="currentStep"
      @step-change="onStepChange"
    />

    <div class="step-content">
      <AppStep1Req
        v-if="currentStep === 1"
        :categories="categories"
        :projects="projects"
        :req-base-path="reqBasePath"
        :current-category="currentCategory"
        :current-project="currentProject"
        @category-change="onCategoryChange"
        @project-change="onProjectChange"
        @create-category="createCategory"
        @create-requirement="createRequirement"
      />

      <AppStep2Design
        v-else-if="currentStep === 2"
        :category="currentCategory"
        :name="currentProject"
        :req-base-path="reqBasePath"
        @save-spec="onSaveSpec"
        @spec-updated="refreshSpec"
      />

      <AppStep3Code
        v-else-if="currentStep === 3"
        :category="currentCategory"
        :name="currentProject"
        :req-base-path="reqBasePath"
      />

      <AppStep4Test
        v-else-if="currentStep === 4"
        :category="currentCategory"
        :name="currentProject"
        :req-base-path="reqBasePath"
      />
    </div>

    <div class="status-bar">
      <span v-if="projectKey">{{ projectKey }}</span>
      <span v-else>选择需求开始</span>
    </div>
  </div>
</template>

<script>
import AppWorkflowStep from './components/AppWorkflowStep.vue'
import AppStep1Req from './components/AppStep1Req.vue'
import AppStep2Design from './components/AppStep2Design.vue'
import AppStep3Code from './components/AppStep3Code.vue'
import AppStep4Test from './components/AppStep4Test.vue'
import { api } from '../../api'

export default {
  name: 'AppDevWorkflowView',
  components: {
    AppWorkflowStep,
    AppStep1Req,
    AppStep2Design,
    AppStep3Code,
    AppStep4Test
  },
  data() {
    return {
      currentCategory: '',
      currentProject: '',
      currentStep: 1,
      categories: [],
      projects: {},
      reqBasePath: ''
    }
  },
  computed: {
    projectKey() {
      if (!this.currentCategory || !this.currentProject) return ''
      return `${this.currentCategory}/${this.currentProject}`
    }
  },
  async created() {
    await this.loadState()
    await this.loadCategories()
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
      try {
        const catPath = `${this.reqBasePath}/${category}`
        const res = await api.browseFilesystem(catPath)
        const items = res.data?.items || []
        this.projects = {}
        items.filter(item => item.is_directory).forEach(item => {
          const key = `${category}/${item.name}`
          this.projects[key] = { name: item.name, stepStatus: {} }
        })
      } catch (e) {
        console.error('Load projects failed:', e)
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
      await this.saveState()
    },
    onProjectChange(proj) {
      this.currentProject = proj
      if (this.currentProject) {
        this.currentStep = 2
      } else if (this.currentStep > 1) {
        this.currentStep = 1
      }
      this.saveState()
    },
    onStepChange(step) {
      if (!this.currentProject && step > 1) {
        return
      }
      this.currentStep = step
      this.saveState()
    },
    async createCategory(name) {
      if (this.categories.includes(name)) {
        return
      }
      try {
        const newPath = `${this.reqBasePath}/${name}`
        await api.createDirectory(newPath)
        this.categories.push(name)
        this.categories.sort()
      } catch (e) {
        console.error('Create category failed:', e)
      }
    },
    async createRequirement({ category, name }) {
      if (this.projects[name]) {
        return
      }

      try {
        const reqDirPath = `${this.reqBasePath}/${category}/${name}`
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
        const specPath = `${this.reqBasePath}/${category}/${name}/${name}_方案.md`
        await api.writeFile(specPath, specContent)
      } catch (e) {
        console.error('Write spec file failed:', e)
      }

      let sessionData = { designSessionId: '', codeSessionId: '', testSessionId: '' }
      try {
        const [designRes, codeRes, testRes] = await Promise.all([
          api.createSession(`workflow:${category}/${name}:design`),
          api.createSession(`workflow:${category}/${name}:code`),
          api.createSession(`workflow:${category}/${name}:test`)
        ])
        sessionData = {
          designSessionId: designRes.data?.id || '',
          codeSessionId: codeRes.data?.id || '',
          testSessionId: testRes.data?.id || ''
        }
        const sessionPath = `${this.reqBasePath}/${category}/${name}/session.json`
        await api.writeFile(sessionPath, JSON.stringify(sessionData, null, 2))
      } catch (e) {
        console.error('Create sessions failed:', e)
      }

      const key = `${category}/${name}`
      this.$set(this.projects, key, { name, stepStatus: {} })
      this.currentCategory = category
      this.currentProject = name
      this.currentStep = 2
      await this.saveState()
    },
    async onSaveSpec(content) {
      if (!this.projectKey) return
      const specPath = `${this.reqBasePath}/${this.currentCategory}/${this.currentProject}/${this.currentProject}_方案.md`
      try {
        await api.writeFile(specPath, content)
      } catch (e) {
        console.error('Save spec failed:', e)
      }
    },
    async refreshSpec() {
      if (this.currentCategory && this.currentProject) {
        await this.loadProjectsForCategory(this.currentCategory)
      }
    }
  }
}
</script>

<style scoped>
.dev-workflow-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a09;
}

.step-content {
  flex: 1;
  overflow: hidden;
}

.status-bar {
  padding: 10px 16px;
  background: #121212;
  border-top: 1px solid #27272a;
  font-size: 12px;
  color: #84848a;
  text-align: center;
}
</style>
