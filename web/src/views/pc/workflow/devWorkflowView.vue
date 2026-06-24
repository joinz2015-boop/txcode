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
          @create-sub-scheme="createSubScheme"
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

        <SubSchemeDialog
          :visible.sync="subSchemeDialogVisible"
          :category="currentCategory"
          :parent-name="currentProject"
          :default-name="subSchemeDefaultName"
          @confirm="onSubSchemeConfirm"
          @cancel="subSchemeDialogVisible = false"
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
import WorkflowSidebar from '../../../components/pc/workflow/WorkflowSidebar.vue'
import Step1NewReq from '../../../components/pc/workflow/Step1NewReq.vue'
import Step2Design from '../../../components/pc/workflow/Step2Design.vue'
import Step3CodeGen from '../../../components/pc/workflow/Step3CodeGen.vue'
import Step4Test from '../../../components/pc/workflow/Step4Test.vue'
import SubSchemeDialog from '../../../components/pc/workflow/SubSchemeDialog.vue'
import { api } from '../../../api'

export default {
  name: 'DevWorkflowView',
  components: {
    WorkflowSidebar,
    Step1NewReq,
    Step2Design,
    Step3CodeGen,
    Step4Test,
    SubSchemeDialog
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
      isLoadingProjects: false,
      designSessionId: '',
      codeSessionId: '',
      testSessionId: '',
      taskStatus: 'idle',
      unsubRunning: null,
      subSchemeDialogVisible: false,
      subSchemeDefaultName: ''
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
    const qCategory = this.$route.query?.category
    const qProject = this.$route.query?.project
    const qStep = parseInt(this.$route.query?.step) || 1
    const hasQueryParams = !!(qCategory && qProject)

    this.loadCategories()

    if (hasQueryParams) {
      this.currentCategory = qCategory
      this.currentProject = qProject
      this.currentStep = qStep
    } else {
      this.loadState()
    }
  },
  mounted() {
    console.log('[DevWorkflow][mounted] subscribing to running_sessions')
    api.ws.init()
    this.unsubRunning = api.ws.on('running_sessions', (msg) => {
      const runningIds = msg.data?.runningSessionIds || []
      console.log('[DevWorkflow][ws] running_sessions event:', runningIds)
      this.updateTaskStatus(runningIds)
    })
  },
  beforeDestroy() {
    if (this.unsubRunning) {
      this.unsubRunning()
      this.unsubRunning = null
    }
  },
  watch: {
    currentProject() {
      this.updateTitle()
    },
    taskStatus() {
      this.updateTitle()
    }
  },
  methods: {
    updateDesignSessionId(id) {
      console.log('[DevWorkflow][sessionId] design:', id)
      this.designSessionId = id
    },
    updateCodeSessionId(id) {
      console.log('[DevWorkflow][sessionId] code:', id)
      this.codeSessionId = id
    },
    updateTestSessionId(id) {
      console.log('[DevWorkflow][sessionId] test:', id)
      this.testSessionId = id
    },
    updateTaskStatus(runningIds) {
      const mySessions = [this.designSessionId, this.codeSessionId, this.testSessionId].filter(Boolean)
      console.log('[DevWorkflow][taskStatus] mySessions:', mySessions, 'runningIds:', runningIds)
      if (mySessions.length === 0) {
        console.log('[DevWorkflow][taskStatus] -> idle (no sessions)')
        this.taskStatus = 'idle'
        return
      }
      const isRunning = mySessions.some(id => runningIds.includes(id))
      console.log('[DevWorkflow][taskStatus] isRunning:', isRunning, 'prevStatus:', this.taskStatus)
      if (isRunning) {
        console.log('[DevWorkflow][taskStatus] -> running')
        this.taskStatus = 'running'
      } else if (this.taskStatus === 'running') {
        console.log('[DevWorkflow][taskStatus] -> completed')
        this.taskStatus = 'completed'
      }
    },
    updateTitle() {
      const base = this.$route.meta?.title || '软件研发'
      if (!this.currentProject) {
        document.title = `${base} - TXCode`
        return
      }
      let prefix = ''
      if (this.taskStatus === 'running') prefix = '⏳ '
      else if (this.taskStatus === 'completed') prefix = '✅ '
      console.log('[DevWorkflow][updateTitle] status:', this.taskStatus, 'title:', `${prefix}${this.currentProject} · ${base} - TXCode`)
      document.title = `${prefix}${this.currentProject} · ${base} - TXCode`
    },
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
      this.isLoadingProjects = true
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
        const newPath = `${this.reqBasePath}/${name}`
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
        const oldPath = `${this.reqBasePath}/${oldName}`
        const newPath = `${this.reqBasePath}/${newName}`
        await api.renameFile(oldPath, newPath)
        
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
        const deletePath = `${this.reqBasePath}/${catName}`
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
      this.$message.success(`需求「${name}」创建成功`)
      this.$nextTick(() => {
        this.currentStep = 2
      })
    },
    async createSubScheme() {
      if (!this.currentProject || !this.currentCategory) {
        this.$message.warning('请先选择一个方案')
        return
      }

      const parentName = this.currentProject
      try {
        const catPath = `${this.reqBasePath}/${this.currentCategory}`
        const res = await api.browseFilesystem(catPath)
        const items = res.data?.items || []
        let maxNum = 0
        const pattern = new RegExp(`^${this.escapeRegex(parentName)}_(\\d+)$`)
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
        this.$message.error('获取子方案列表失败')
      }
    },
    escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
        this.$message.error('创建子方案目录失败')
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
      this.$message.success(`子方案「${subName}」创建成功`)

      window.open(`#/views/pc/devWorkflow?category=${encodeURIComponent(category)}&project=${encodeURIComponent(subName)}&step=2`, '_blank')
    },
    async onSaveSpec(content) {
      if (!this.projectKey) return
      const specPath = `${this.reqBasePath}/${this.currentCategory}/${this.currentProject}/${this.currentProject}_方案.md`
      try {
        await api.writeFile(specPath, content)
        this.$message.success('方案已保存')
      } catch (e) {
        console.error('Save spec failed:', e)
        this.$message.error('保存方案失败')
      }
    },
    async refreshSpec() {
      if (this.$refs.step2Ref?.loadSpec) {
        await this.$refs.step2Ref.loadSpec()
      }
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
