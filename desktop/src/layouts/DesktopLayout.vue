<template>
  <div class="app-root">
    <DesktopTitleBar
      :currentProject="currentProject"
      :projects="projects"
      @selectProject="handleSelectProject"
      @deleteProject="handleDeleteProject"
      @openProject="handleOpenProject"
    />
    <div class="main-body">
      <DesktopNavRail />
      <div class="content-area">
        <keep-alive>
          <router-view />
        </keep-alive>
      </div>
    </div>
    <DesktopStatusBar
      :currentProjectName="currentProject.name"
      :currentModel="currentModel"
      :nodeVersion="nodeVersion"
      :appVersion="appVersion"
    />

    <DesktopSelectProjectDialog
      v-if="projectDialogVisible"
      @close="projectDialogVisible = false"
      @success="handleProjectDialogSuccess"
    />

    <div class="overlay" v-if="deleteConfirmVisible" @click.self="deleteConfirmVisible = false">
      <div class="confirm-dialog">
        <div class="dialog-header">
          <span>删除确认</span>
          <button class="dialog-close" @click="deleteConfirmVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <p class="confirm-text">确定要删除项目「{{ deleteTarget?.name }}」的记录吗？</p>
          <p class="confirm-hint">仅删除数据库记录，不删除实际文件。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="deleteConfirmVisible = false">取消</button>
          <button class="btn-danger" @click="handleConfirmDelete" :disabled="deleteLoading">
            {{ deleteLoading ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopTitleBar from '@/components/DesktopTitleBar.vue'
import DesktopNavRail from '@/components/DesktopNavRail.vue'
import DesktopStatusBar from '@/components/DesktopStatusBar.vue'
import DesktopSelectProjectDialog from '@/components/config/DesktopSelectProjectDialog.vue'
import { getPort, getAppVersion, getNodeVersion } from '@/utils/ipc'
import { setBaseURL, getConfig, getProjects, getCurrentProject, setCurrentProject, deleteProject } from '@/api/index'
import { ws } from '@/utils/websocket'
import { getItem, setItem } from '@/utils/storage'

export default {
  name: 'DesktopLayout',
  components: {
    DesktopTitleBar,
    DesktopNavRail,
    DesktopStatusBar,
    DesktopSelectProjectDialog,
  },
  provide() {
    return {
      desktopState: this,
    }
  },
  data() {
    return {
      currentProject: getItem('project:current', { name: 'txcode', path: '', color: '#4f6ef7' }),
      projects: getItem('project:list', [{ name: 'txcode', path: '', color: '#4f6ef7' }]),
      currentModel: getItem('model:current', 'DeepSeek V3'),
      nodeVersion: '',
      appVersion: '1.0.55',
      runningSessionIds: [],
      unsubRunning: null,
      projectDialogVisible: false,
      deleteConfirmVisible: false,
      deleteTarget: null,
      deleteLoading: false,
    }
  },
  methods: {
    async handleSelectProject(project) {
      try {
        await setCurrentProject(project.id)
        this.currentProject = project
        setItem('project:current', project)
        location.reload()
      } catch (e) {
        console.error('切换项目失败:', e)
      }
    },
    handleDeleteProject(project) {
      this.deleteTarget = project
      this.deleteConfirmVisible = true
    },
    async handleConfirmDelete() {
      if (!this.deleteTarget) return
      this.deleteLoading = true
      try {
        await deleteProject(this.deleteTarget.id)
        if (this.currentProject?.id === this.deleteTarget.id) {
          this.currentProject = { name: 'txcode', path: '', color: '#4f6ef7' }
          setItem('project:current', this.currentProject)
        }
        await this.loadProjects()
        setItem('project:list', this.projects)
        this.deleteConfirmVisible = false
        this.deleteTarget = null
      } catch (e) {
        console.error('删除项目失败:', e)
      } finally {
        this.deleteLoading = false
      }
    },
    handleOpenProject() {
      this.projectDialogVisible = true
    },
    async handleProjectDialogSuccess() {
      this.projectDialogVisible = false
      await this.loadProjects()
      setItem('project:list', this.projects)
      location.reload()
    },
    async loadProjects() {
      try {
        const res = await getProjects()
        this.projects = (res.data || []).map(p => ({ ...p, color: '#4f6ef7' }))
        if (this.projects.length > 0) {
          const cur = await getCurrentProject()
          if (cur.data) {
            this.currentProject = { ...cur.data, color: '#4f6ef7' }
          } else {
            this.currentProject = this.projects[0]
          }
        }
        setItem('project:current', this.currentProject)
      } catch (e) {
        console.error('加载项目失败:', e)
      }
    },
  },
  async mounted() {
    try {
      const port = await getPort()
      setBaseURL(port)
      ws.init(port)
    } catch (e) {
      console.error('Init error:', e)
    }
    try {
      const nv = await getNodeVersion()
      this.nodeVersion = nv
    } catch (e) {}

    try {
      const r = await getConfig('defaultModel')
      if (r.data && r.data.value) {
        this.currentModel = r.data.value
        setItem('model:current', r.data.value)
      }
    } catch (e) {}

    try {
      await this.loadProjects()
      setItem('project:list', this.projects)
    } catch (e) {
      console.error('Init projects error:', e)
    }

    this.unsubRunning = ws.on('running_sessions', (msg) => {
      this.runningSessionIds = (msg.data && msg.data.runningSessionIds) || (msg.runningSessionIds) || []
    })
  },
  beforeDestroy() {
    if (this.unsubRunning) { this.unsubRunning(); this.unsubRunning = null }
    ws.disconnect()
  }
}
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg-window);
  overflow: hidden;
}
.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-chat);
  position: relative;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-dialog {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  width: 380px;
  max-width: 90vw;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.dialog-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { padding: 20px 16px; }
.confirm-text { font-size: 14px; color: var(--text-primary); margin: 0; }
.confirm-hint { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-danger {
  padding: 6px 14px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}
.btn-danger:hover { background: #dc2626; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
