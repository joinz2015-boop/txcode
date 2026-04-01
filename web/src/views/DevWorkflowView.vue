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
          v-show="currentStep === 2 && hasSelectedProject"
          :project-key="projectKey"
          :spec-content="currentSpecContent"
          :session-id="currentSessionId"
          :req-base-path="reqBasePath"
          @update:sessionId="updateDesignSessionId"
          @save-spec="onSaveSpec"
          @spec-updated="refreshSpec"
          ref="step2Ref"
        />

        <Step3CodeGen
          v-show="currentStep === 3 && hasSelectedProject"
          :project-key="projectKey"
          :session-id="currentCodeSessionId"
          :req-base-path="reqBasePath"
          @update:sessionId="updateCodeSessionId"
          ref="step3Ref"
        />

        <Step4Test
          v-show="currentStep === 4 && hasSelectedProject"
          :project-key="projectKey"
          :session-id="currentTestSessionId"
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

const STORAGE_KEY = 'software_dev_workflow'

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
      categories: [],
      projects: {},
      currentStep: 1,
      reqBasePath: '',
      isLoadingProjects: false
    }
  },
  computed: {
    projectKey() {
      if (!this.currentCategory || !this.currentProject) return ''
      return `${this.currentCategory}/${this.currentProject}`
    },
    currentProjectData() {
      return this.projects[this.projectKey] || null
    },
    hasSelectedProject() {
      return !!this.currentProjectData
    },
    currentSpecContent() {
      return this.currentProjectData?.specFile || ''
    },
    currentChatMessages() {
      if (!this.currentProjectData) return []
      switch (this.currentStep) {
        case 2: return this.currentProjectData.designChatHistory || []
        case 3: return this.currentProjectData.codeChatHistory || []
        case 4: return this.currentProjectData.testChatHistory || []
        default: return []
      }
    },
    currentSessionId() {
      if (!this.currentProjectData) return ''
      return this.currentProjectData.designSessionId || ''
    },
    currentCodeSessionId() {
      if (!this.currentProjectData) return ''
      return this.currentProjectData.codeSessionId || ''
    },
    currentTestSessionId() {
      if (!this.currentProjectData) return ''
      return this.currentProjectData.testSessionId || ''
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
    getSpecPath(category, project) {
      return `${this.reqBasePath}\\${category}\\${project}\\${project}_方案.md`
    },
    getLegacySpecPath(category, project) {
      return `${this.reqBasePath}\\${category}\\${project}\\方案.md`
    },
    getSessionPath(category, project) {
      return `${this.reqBasePath}\\${category}\\${project}\\session.json`
    },
    async readSessionConfig(category, project) {
      const sessionPath = this.getSessionPath(category, project)
      try {
        const sessionRes = await api.getFileContent(sessionPath)
        return JSON.parse(sessionRes.content || '{}')
      } catch (e) {
        return {}
      }
    },
    async writeSessionConfig(category, project, sessionData) {
      const sessionPath = this.getSessionPath(category, project)
      await api.writeFile(sessionPath, JSON.stringify(sessionData, null, 2))
    },
    async persistProjectSessionsByKey(projectKey, overrides = {}) {
      if (!projectKey) return
      const [cat, proj] = projectKey.split('/')
      const current = this.projects[projectKey] || {}
      const nextSessionData = {
        designSessionId: overrides.designSessionId ?? current.designSessionId ?? '',
        codeSessionId: overrides.codeSessionId ?? current.codeSessionId ?? '',
        testSessionId: overrides.testSessionId ?? current.testSessionId ?? ''
      }
      await this.writeSessionConfig(cat, proj, nextSessionData)
    },
    loadState() {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved)
        this.projects = state.projects || {}
        this.currentCategory = state.currentCategory || ''
        this.currentProject = state.currentProject || ''
        this.currentStep = state.currentStep || 1
      }
    },
    saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentCategory: this.currentCategory,
        currentProject: this.currentProject,
        projects: this.projects,
        currentStep: this.currentStep
      }))
    },
    generateSessionId() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
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
        await this.loadAllRequirements()
        this.ensureValidSelection()
      } catch (e) {
        console.error('Load categories failed:', e)
        this.categories = []
      }
    },
    ensureValidSelection() {
      if (!this.categories.length) {
        this.currentCategory = ''
        this.currentProject = ''
        this.currentStep = 1
        this.saveState()
        return
      }

      if (!this.currentCategory || !this.categories.includes(this.currentCategory)) {
        this.currentCategory = this.categories[0]
      }

      const projectList = Object.keys(this.projects)
        .filter(key => key.startsWith(`${this.currentCategory}/`))
        .map(key => key.split('/')[1])
        .sort()

      if (!projectList.length) {
        this.currentProject = ''
        this.currentStep = 1
      } else if (!this.currentProject || !projectList.includes(this.currentProject)) {
        this.currentProject = projectList[0]
      }

      this.saveState()
    },
    async loadAllRequirements() {
      const existingProjects = { ...this.projects }
      this.projects = {}
      for (const cat of this.categories) {
        await this.loadRequirementsForCategory(cat, existingProjects)
      }
    },
    async loadRequirementsForCategory(category, existingProjects = {}) {
      try {
        const catPath = `${this.reqBasePath}\\${category}`
        const res = await api.browseFilesystem(catPath)
        const items = res.data?.items || []
        const reqDirs = items.filter(item => item.is_directory)
        
        for (const req of reqDirs) {
          const key = `${category}/${req.name}`
          const reqPath = `${catPath}\\${req.name}`
          const specPath = this.getSpecPath(category, req.name)
          const legacySpecPath = this.getLegacySpecPath(category, req.name)
          const sessionPath = this.getSessionPath(category, req.name)
          let reqItems = []
          try {
            const reqRes = await api.browseFilesystem(reqPath)
            reqItems = reqRes.data?.items || []
          } catch {
            reqItems = []
          }
          const reqItemNames = new Set(reqItems.map(item => item.name))
          const hasNamedSpec = reqItemNames.has(`${req.name}_方案.md`)
          const hasLegacySpec = reqItemNames.has('方案.md')
          const hasSessionFile = reqItemNames.has('session.json')
          
          let specContent = ''
          if (hasNamedSpec) {
            try {
              const specRes = await api.getFileContent(specPath)
              specContent = specRes.content || ''
            } catch {
              specContent = ''
            }
          } else if (hasLegacySpec) {
            try {
              const legacyRes = await api.getFileContent(legacySpecPath)
              specContent = legacyRes.content || ''
              // Auto migrate old spec filename to new naming convention.
              await api.writeFile(specPath, specContent)
            } catch {
              specContent = ''
            }
          }

          let sessionData = {}
          if (hasSessionFile) {
            sessionData = await this.readSessionConfig(category, req.name)
          } else {
            sessionData = { designSessionId: '', codeSessionId: '', testSessionId: '' }
            try {
              await api.writeFile(sessionPath, JSON.stringify(sessionData, null, 2))
            } catch {
              // Keep in-memory fallback when write fails.
            }
          }
          
          const existing = existingProjects[key]
          this.$set(this.projects, key, {
            category,
            name: req.name,
            specFile: specContent,
            designSessionId: sessionData.designSessionId || existing?.designSessionId || '',
            codeSessionId: sessionData.codeSessionId || existing?.codeSessionId || '',
            testSessionId: sessionData.testSessionId || existing?.testSessionId || '',
            designChatHistory: existing?.designChatHistory || [],
            codeChatHistory: existing?.codeChatHistory || [],
            testChatHistory: existing?.testChatHistory || [],
            stepStatus: existing?.stepStatus || { 1: true, 2: false, 3: false, 4: false }
          })
        }
      } catch (e) {
        console.error(`Load requirements for ${category} failed:`, e)
      }
    },
    async onCategoryChange(cat) {
      this.currentCategory = cat
      this.currentProject = ''
      if (!cat) {
        this.saveState()
        return
      }
      this.isLoadingProjects = true
      await this.loadRequirementsForCategory(cat, this.projects)
      this.isLoadingProjects = false
      this.saveState()
    },
    onProjectChange(proj) {
      this.currentProject = proj
      if (!this.currentProject && this.currentStep > 1) {
        this.currentStep = 1
      }
      this.saveState()
    },
    onStepChange(step) {
      if (!this.currentProjectData && step > 1) {
        return
      }
      this.currentStep = step
      this.saveState()
    },
    async updateDesignSessionId(sessionId) {
      if (!sessionId || !this.projectKey) return
      const key = this.projectKey
      const current = this.projects[key] || {}
      this.$set(this.projects, key, { ...current, designSessionId: sessionId })
      this.saveState()
      try {
        await this.persistProjectSessionsByKey(key, { designSessionId: sessionId })
      } catch (e) {
        console.error('Persist design session failed:', e)
      }
    },
    async updateCodeSessionId(sessionId) {
      if (!sessionId || !this.projectKey) return
      const key = this.projectKey
      const current = this.projects[key] || {}
      this.$set(this.projects, key, { ...current, codeSessionId: sessionId })
      this.saveState()
      try {
        await this.persistProjectSessionsByKey(key, { codeSessionId: sessionId })
      } catch (e) {
        console.error('Persist code session failed:', e)
      }
    },
    async updateTestSessionId(sessionId) {
      if (!sessionId || !this.projectKey) return
      const key = this.projectKey
      const current = this.projects[key] || {}
      this.$set(this.projects, key, { ...current, testSessionId: sessionId })
      this.saveState()
      try {
        await this.persistProjectSessionsByKey(key, { testSessionId: sessionId })
      } catch (e) {
        console.error('Persist test session failed:', e)
      }
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

        const newProjects = {}
        for (const key in this.projects) {
          const [cat, proj] = key.split('/')
          if (cat === oldName) {
            const newKey = `${newName}/${proj}`
            newProjects[newKey] = { ...this.projects[key], category: newName }
          } else {
            newProjects[key] = this.projects[key]
          }
        }
        this.projects = newProjects

        if (this.currentCategory === oldName) {
          this.currentCategory = newName
        }
        this.saveState()
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

        const keysToDelete = []
        for (const key in this.projects) {
          if (key.startsWith(catName + '/')) {
            keysToDelete.push(key)
          }
        }
        keysToDelete.forEach(key => delete this.projects[key])

        if (this.currentCategory === catName) {
          this.currentCategory = ''
          this.currentProject = ''
        }
        this.saveState()
        this.$message.success(`大类「${catName}」已删除`)
      } catch (e) {
        console.error('Delete category failed:', e)
        this.$message.error('删除大类失败')
      }
    },
    async createRequirement({ category, name }) {
      const key = `${category}/${name}`
      if (this.projects[key]) {
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
        const specPath = this.getSpecPath(category, name)
        await api.writeFile(specPath, specContent)
      } catch (e) {
        console.error('Write spec file failed:', e)
      }

      let designSessionId = ''
      let codeSessionId = ''
      let testSessionId = ''
      try {
        await this.writeSessionConfig(category, name, {
          designSessionId,
          codeSessionId,
          testSessionId
        })
      } catch (e) {
        console.error('Write session.json failed:', e)
        this.$message.error('session.json 创建失败')
        return
      }

      this.$set(this.projects, key, {
        category,
        name,
        specFile: specContent,
        designSessionId,
        codeSessionId,
        testSessionId,
        designChatHistory: [],
        codeChatHistory: [],
        testChatHistory: [],
        stepStatus: { 1: true, 2: false, 3: false, 4: false }
      })

      this.currentCategory = category
      this.currentProject = name
      this.saveState()

      this.$message.success(`需求「${name}」创建成功`)
      this.$nextTick(() => {
        this.currentStep = 2
        this.saveState()
      })
    },
    async onSaveSpec(content) {
      if (!this.projectKey) return
      this.projects[this.projectKey].specFile = content
      this.saveState()
      
      const [cat, proj] = this.projectKey.split('/')
      const specPath = this.getSpecPath(cat, proj)
      try {
        await api.writeFile(specPath, content)
        this.$message.success('方案已保存')
      } catch (e) {
        console.error('Save spec to filesystem failed:', e)
        this.$message.error('保存方案失败')
      }
    },
    saveSpec() {
      if (this.$refs.step2Ref) {
        this.$refs.step2Ref.saveSpec()
      }
    },
    async refreshSpec() {
      if (!this.projectKey) return
      const [cat, proj] = this.projectKey.split('/')
      const specPath = this.getSpecPath(cat, proj)
      const legacySpecPath = this.getLegacySpecPath(cat, proj)
      try {
        let newContent = ''
        try {
          const res = await api.getFileContent(specPath)
          newContent = res.content ?? res.data?.content ?? ''
        } catch {
          const legacyRes = await api.getFileContent(legacySpecPath)
          newContent = legacyRes.content ?? legacyRes.data?.content ?? ''
        }
        const current = this.projects[this.projectKey]
        if (current) {
          // Reassign root object to guarantee reactive update propagation.
          this.projects = {
            ...this.projects,
            [this.projectKey]: {
              ...current,
              specFile: newContent
            }
          }
          this.saveState()
        }
        // Force-sync editor view to eliminate stale content in Monaco.
        if (this.currentStep === 2 && this.$refs.step2Ref?.syncEditorContent) {
          this.$refs.step2Ref.syncEditorContent(newContent)
        }
        this.$message.success('方案已刷新')
      } catch (e) {
        console.error('Refresh spec failed:', e)
        this.$message.error('刷新方案失败')
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
