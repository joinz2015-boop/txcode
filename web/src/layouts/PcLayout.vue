<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <header class="h-10 bg-sidebar border-b border-black flex items-center justify-between px-4 shrink-0 z-20">
<div class="flex items-center gap-4">
        <div class="font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-robot text-accent"></i>
          <span>TXCode Agent</span>
        </div>
        <div class="relative">
          <a href="/#/views/pc/devWorkflow" target="_blank" class="hover:text-white px-3 py-1 rounded border border-transparent hover:border-accent transition-colors cursor-pointer" :class="$route.name === 'devWorkflow' ? 'text-accent border-accent' : 'text-gray-400'">
            <i class="fa-solid fa-laptop-code mr-1"></i> 软件研发
          </a>
        </div>
        <div class="relative">
          <a href="/#/views/pc/designView" target="_blank" class="hover:text-white px-3 py-1 rounded border border-transparent hover:border-accent transition-colors cursor-pointer" :class="$route.name === 'designView' ? 'text-accent border-accent' : 'text-gray-400'">
            <i class="fa-solid fa-pen-ruler mr-1"></i> 软件设计
          </a>
        </div>
        <div class="relative">
          <router-link to="/views/pc/deploy" class="hover:text-white px-3 py-1 rounded border border-transparent hover:border-accent transition-colors cursor-pointer" :class="$route.name === 'deploy' ? 'text-accent border-accent' : 'text-gray-400'">
            <i class="fa-solid fa-rocket mr-1"></i> 部署
          </router-link>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <el-dropdown @command="handleProjectChange" trigger="click">
          <span class="text-white text-sm cursor-pointer hover:text-accent">
            <i class="fa-solid fa-folder mr-1"></i>
            {{ currentProject?.name || '选择项目' }}
            <i class="fa-solid fa-chevron-down ml-1 text-xs"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item v-for="proj in projects" :key="proj.id" :command="proj.id">
              <span :class="proj.id === currentProject?.id ? 'text-accent' : ''">{{ proj.name }}</span>
            </el-dropdown-item>
            <el-dropdown-item divided command="__open__">
              <i class="fa-solid fa-folder-open mr-1"></i> 打开项目文件夹
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <SelectProjectDialog
          :visible.sync="selectProjectDialogVisible"
          @success="handleProjectDialogSuccess"
        />
        <span class="text-xs text-textMuted" v-if="systemVersion">v{{ systemVersion }}</span>
        <span class="text-xs text-textMuted mr-2"><i class="fa-solid fa-circle text-green-500 text-[8px]"></i> Server Connected</span>
        <button v-show="$route.name === 'chat'" @click="toggleSidebar" class="hover:text-white" :title="sidebarVisible ? '关闭侧栏' : '显示侧栏'"><i class="fa-solid fa-columns"></i></button>
        <!-- <router-link to="/settings" class="hover:text-white" title="设置"><i class="fa-solid fa-gear"></i></router-link> -->
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <nav class="w-12 bg-activityBar flex flex-col items-center py-2 shrink-0 border-r border-black z-10 justify-between">
        <div class="flex flex-col items-center w-full">
          <router-link to="/views/pc/codeView" class="w-10 h-10 mb-2 rounded flex items-center justify-center relative" :class="$route.name === 'codeView' || $route.name === 'codeView-session' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="工作台">
            <i class="fa-regular fa-comments text-xl"></i>
          </router-link>
          <router-link to="/views/pc/files" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'files' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="文件">
            <i class="fa-solid fa-folder-open text-xl"></i>
          </router-link>
          <router-link to="/views/pc/git-changes" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'gitChanges' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="Git 变更">
            <i class="fa-brands fa-git-alt text-xl"></i>
          </router-link>
          <router-link to="/views/pc/terminal" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'terminal' || $route.name === 'terminal-session' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="终端">
            <i class="fa-solid fa-terminal text-xl"></i>
          </router-link>
          <router-link to="/views/pc/skills" class="w-10 h-10 mb-2 rounded flex items-center justify-center relative" :class="$route.name === 'skills' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="Skill 管理">
            <i class="fa-solid fa-shapes text-xl"></i>
          </router-link>
          <router-link to="/views/pc/db" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'db' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="数据库">
            <i class="fa-solid fa-database text-xl"></i>
          </router-link>
          <router-link to="/views/pc/tasks" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'tasks' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="任务">
            <i class="fa-solid fa-clock text-xl"></i>
          </router-link>
          <router-link to="/views/pc/aiLogs" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'aiLogs' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="AI 日志">
            <i class="fa-solid fa-robot text-xl"></i>
          </router-link>
          <router-link to="/views/pc/wiki" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'wiki' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="文档">
            <i class="fa-solid fa-book text-xl"></i>
          </router-link>
          <router-link to="/views/pc/fileZihao" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'fileZihao' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="文件互联">
            <i class="fa-solid fa-server text-xl"></i>
          </router-link>
        </div>
        <div class="flex flex-col items-center w-full mb-2">
          <router-link to="/views/pc/settings" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'settings' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent hover:bg-white/5'" title="设置">
            <i class="fa-solid fa-gear text-xl"></i>
          </router-link>
        </div>
      </nav>

      <keep-alive :include="['CodeView', 'TerminalView', 'Files']">
        <router-view class="flex-1 flex overflow-hidden" :sidebar-visible="sidebarVisible" @toggle-sidebar="toggleSidebar" />
      </keep-alive>
    </div>

    <footer class="h-6 bg-accent text-white text-xs flex items-center justify-between px-3 shrink-0 z-20">
      <div class="flex items-center gap-4">
        <span><i class="fa-solid fa-code-branch"></i> main</span>
      </div>
      <div class="flex items-center gap-4">
        <span>TXCode</span>
        <span>UTF-8</span>
      </div>
    </footer>
  </div>
</template>

<script>
import { api } from '../api/index.js'
import SelectProjectDialog from '../components/pc/config/SelectProjectDialog.vue'

export default {
  name: 'Layout',
  components: {
    SelectProjectDialog
  },
  data() {
    return {
      sidebarVisible: true,
      showSessionDropdown: false,
      sessions: [],
      currentSessionId: null,
      currentSessionName: '',
      projects: [],
      currentProject: null,
      selectProjectDialogVisible: false,
      systemVersion: ''
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible
    },
    toggleSessionDropdown() {
      this.showSessionDropdown = !this.showSessionDropdown
    },
    async switchSession(session) {
      this.currentSessionId = session.id
      this.currentSessionName = session.title
      this.showSessionDropdown = false
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'chat-session', params: { id: session.id } }).catch(() => {})
      }
    },
    async createNewSession() {
      try {
        const res = await api.createSession('新会话')
        this.sessions.unshift(res.data)
        this.switchSession(res.data)
        this.showSessionDropdown = false
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message)
      }
    },
    async loadSessions() {
      try {
        const res = await api.getSessions()
        this.sessions = res.data || []
        if (this.sessions.length > 0 && !this.currentSessionId) {
          this.currentSessionId = this.sessions[0].id
          this.currentSessionName = this.sessions[0].title
        }
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    },
    async loadProjects() {
      try {
        const res = await api.getProjects()
        this.projects = res.data || []
        const cur = await api.getCurrentProject()
        this.currentProject = cur.data || null
      } catch (e) {
        console.error('加载项目失败:', e)
      }
    },
    async handleProjectChange(projectId) {
      if (projectId === '__open__') {
        const dropdown = this.$el.querySelector('.el-dropdown')
        if (dropdown) {
          dropdown.click()
        }
        this.selectProjectDialogVisible = true
        return
      }
      try {
        await api.setCurrentProject(projectId)
        const proj = this.projects.find(p => p.id === projectId)
        if (proj) {
          this.currentProject = proj
        }
        location.reload()
      } catch (e) {
        this.$message.error('切换项目失败: ' + e.message)
      }
    },
    handleProjectDialogSuccess(project) {
      this.currentProject = project
      this.loadProjects().then(() => {
        location.reload()
      })
    },
    async loadSystemVersion() {
      try {
        const res = await api.getSystemInfo()
        this.systemVersion = res.data?.version || ''
      } catch (e) {
        console.error('获取版本号失败:', e)
      }
    }
  },
  async created() {
    await this.loadProjects()
    await this.loadSessions()
    this.loadSystemVersion()
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.showSessionDropdown = false
      }
    })
  }
}
</script>
