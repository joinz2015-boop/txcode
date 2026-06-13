<template>
  <div class="dev-workflow-view">
    <AppWorkflowStep
      :current-step="currentStep"
      @step-change="onStepChange"
    />

    <div v-if="currentStep === 2 && currentProject" class="step-toolbar">
      <button class="btn-sub-scheme" @click="createSubScheme">
        <i class="fa-solid fa-plus"></i> 新建子方案
      </button>
    </div>

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

    <SubSchemeDialogApp
      :visible.sync="subSchemeDialogVisible"
      :category="currentCategory"
      :parent-name="currentProject"
      :default-name="subSchemeDefaultName"
      @confirm="onSubSchemeConfirm"
      @cancel="subSchemeDialogVisible = false"
    />
  </div>
</template>

<script>
import AppWorkflowStep from '../../../components/app/AppWorkflowStep.vue'
import AppStep1Req from '../../../components/app/AppStep1Req.vue'
import AppStep2Design from '../../../components/app/AppStep2Design.vue'
import AppStep3Code from '../../../components/app/AppStep3Code.vue'
import AppStep4Test from '../../../components/app/AppStep4Test.vue'
import SubSchemeDialogApp from '../../../components/app/SubSchemeDialogApp.vue'
import { api } from '../../../api'

export default {
  name: 'DevWorkflowViewApp',
  components: {
    AppWorkflowStep,
    AppStep1Req,
    AppStep2Design,
    AppStep3Code,
    AppStep4Test,
    SubSchemeDialogApp
  },
  data() {
    return {
      currentCategory: '',
      currentProject: '',
      currentStep: 1,
      categories: [],
      projects: {},
      reqBasePath: '',
      subSchemeDialogVisible: false,
      subSchemeDefaultName: ''
    }
  },
  computed: {
    projectKey() {
      if (!this.currentCategory || !this.currentProject) return ''
      return `${this.currentCategory}/${this.currentProject}`
    }
  },
  async created() {
    const qCategory = this.$route.query?.category
    const qProject = this.$route.query?.project
    const qStep = parseInt(this.$route.query?.step) || 1
    const hasQueryParams = !!(qCategory && qProject)

    await this.loadCategories()

    if (hasQueryParams) {
      this.currentCategory = qCategory
      this.currentProject = qProject
      this.currentStep = qStep
    } else {
      await this.loadState()
    }
  },
  watch: {
    currentProject(val) {
      const base = this.$route.meta?.title || '软件研发'
      if (val) {
        document.title = `${val} · ${base} - TXCode`
      } else {
        document.title = `${base} - TXCode`
      }
    }
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
        const cwd = cwdRes.data?.current_path || ''
        this.reqBasePath = cwd ? `${cwd}/.txcode/req` : ''

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

## 用户原始需求

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
    async createSubScheme() {
      if (!this.currentProject || !this.currentCategory) return

      const parentName = this.currentProject
      try {
        const catPath = `${this.reqBasePath}/${this.currentCategory}`
        const res = await api.browseFilesystem(catPath)
        const items = res.data?.items || []
        let maxNum = 0
        const pattern = new RegExp(`^${parentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)$`)
        items.filter(item => item.is_directory).forEach(item => {
          const match = item.name.match(pattern)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNum) maxNum = num
          }
        })
        const nextNum = String(maxNum + 1).padStart(2, '0')
        this.subSchemeDefaultName = `${parentName}_${nextNum}`
        this.subSchemeDialogVisible = true
      } catch (e) {
        console.error('Browse category failed:', e)
      }
    },
    async onSubSchemeConfirm(subName) {
      this.subSchemeDialogVisible = false
      const parentName = this.currentProject
      const category = this.currentCategory

      try {
        const reqDirPath = `${this.reqBasePath}/${category}/${subName}`
        await api.createDirectory(reqDirPath)
      } catch (e) {
        console.error('Create sub-scheme directory failed:', e)
        return
      }

      const parentSpecPath = `${this.reqBasePath}/${category}/${parentName}/${parentName}_方案.md`
      const specContent = `# ${subName}_方案

> 所属大类：${category}
> 父方案：[../${parentName}/${parentName}_方案.md](../${parentName}/${parentName}_方案.md)

## 用户原始需求

## 业务目标

## 功能点

`

      try {
        const specPath = `${this.reqBasePath}/${category}/${subName}/${subName}_方案.md`
        await api.writeFile(specPath, specContent)
      } catch (e) {
        console.error('Write spec file failed:', e)
      }

      let sessionData = { designSessionId: '', codeSessionId: '', testSessionId: '' }
      try {
        const [designRes, codeRes, testRes] = await Promise.all([
          api.createSession(`workflow:${category}/${subName}:design`),
          api.createSession(`workflow:${category}/${subName}:code`),
          api.createSession(`workflow:${category}/${subName}:test`)
        ])
        sessionData = {
          designSessionId: designRes.data?.id || '',
          codeSessionId: codeRes.data?.id || '',
          testSessionId: testRes.data?.id || '',
          parent: {
            name: parentName,
            specPath: parentSpecPath
          }
        }
        const sessionPath = `${this.reqBasePath}/${category}/${subName}/session.json`
        await api.writeFile(sessionPath, JSON.stringify(sessionData, null, 2))
      } catch (e) {
        console.error('Create sessions failed:', e)
      }

      const key = `${category}/${subName}`
      this.$set(this.projects, key, { name: subName, stepStatus: {} })

      this.$router.push({ path: '/views/app/DevWorkflowViewApp', query: { category, project: subName, step: 2 } })
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

.step-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  background: #121212;
  border-bottom: 1px solid #27272a;
  flex-shrink: 0;
}

.btn-sub-scheme {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
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
