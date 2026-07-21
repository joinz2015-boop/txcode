<template>
  <div class="plan-panel">
    <div class="plan-mode-wrap">
      <DesktopPlanEditor
        ref="planEditor"
        :folderName="planFolderName"
        :filePath="planFilePath"
        :planFilePath="planFilePath"
        :editorFlex="editorFlex"
        @update:content="handleContentUpdated"
        @refresh="refreshPlan"
        @export="exportPlan"
        @create-sub="createSubPlan"
      />
      <div
        class="resize-handle-plan"
        @mousedown="startResize"
        :class="{ active: resizing }"
      ></div>
      <DesktopAssistantPanel
        ref="assistantPanel"
        :panelWidth="assistantWidth"
        :currentModel="currentModel"
        :currentSession="currentSession"
        :planFilePath="planFilePath"
        :runningSessionIds="runningSessionIds"
        @planUpdated="refreshPlan"
      />
    </div>
  </div>
</template>

<script>
import DesktopPlanEditor from './DesktopPlanEditor.vue'
import DesktopAssistantPanel from './DesktopAssistantPanel.vue'
import { createPlanSession, getBaseURL } from '@/api/index'

export default {
  name: 'DesktopPlanPanel',
  components: { DesktopPlanEditor, DesktopAssistantPanel },
  props: {
    currentSession: { type: Object, default: null },
    currentModel: { type: String, default: 'DeepSeek V3' },
    runningSessionIds: { type: Array, default: () => [] }
  },
  data() {
    return {
      assistantWidth: 370,
      resizing: false,
      startX: 0,
      startW: 0,
      _refreshTimer: null
    }
  },
  computed: {
    planFolderName() {
      return this.currentSession ? this.currentSession.folderName : ''
    },
    planFilePath() {
      if (this.currentSession && this.currentSession.meta && this.currentSession.meta.planFilePath) {
        return this.currentSession.meta.planFilePath
      }
      return ''
    },
    editorFlex() {
      return '1'
    }
  },
  watch: {
    currentSession(val) {
      if (val) {
        this.$nextTick(() => {
          if (this.$refs.planEditor) {
            this.$refs.planEditor.refresh()
          }
        })
      }
    }
  },
  methods: {
    open(data) {
      if (data && data.session) {
        // handled by currentSession prop
      }
    },
    handleContentUpdated(content) {
      // content saved by editor
    },
    refreshPlan() {
      if (this._refreshTimer) clearTimeout(this._refreshTimer)
      this._refreshTimer = setTimeout(() => {
        if (this.$refs.planEditor) {
          this.$refs.planEditor.refresh()
        }
      }, 300)
    },
    exportPlan() {
      if (!this.planFilePath) {
        alert('请先选择方案')
        return
      }
      const fileName = this.planFilePath.split('/').pop() || '方案.md'
      const url = `${getBaseURL()}/api/file/download_file?path=${encodeURIComponent(this.planFilePath)}`
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('下载失败')
          return res.blob()
        })
        .then(blob => {
          const downloadUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(downloadUrl)
        })
        .catch(e => alert('导出失败: ' + e.message))
    },
    async createSubPlan() {
      try {
        await createPlanSession('新计划会话', this.planFilePath)
        this.$emit('refreshSessions')
        alert('子方案已创建，请在左侧会话列表中查看')
      } catch (e) {
        console.error('创建子方案失败:', e)
        alert('创建失败: ' + e.message)
      }
    },
    startResize(e) {
      this.resizing = true
      this.startX = e.clientX
      this.startW = this.assistantWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        const newW = Math.max(260, Math.min(600, this.startW + (this.startX - ev.clientX)))
        this.assistantWidth = newW
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    }
  },
  beforeDestroy() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer)
  }
}
</script>

<style scoped>
.plan-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.plan-mode-wrap {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 14px;
  gap: 0;
}
.resize-handle-plan {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  border-radius: 2px;
}
.resize-handle-plan:hover,
.resize-handle-plan.active {
  background: var(--accent);
  opacity: 0.5;
}
</style>
