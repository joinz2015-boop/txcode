<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-sidebar border border-border rounded-lg flex flex-col overflow-hidden" style="width: 90vw; height: 85vh;">
      <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div class="flex items-center gap-2">
          <i class="fa-brands fa-git-alt text-textMain"></i>
          <span class="text-white text-sm font-bold">Git 变更</span>
        </div>
        <button @click="close" class="text-textMuted hover:text-white">
          <i class="fa-solid fa-times text-lg"></i>
        </button>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <git-changes-sidebar
          :width="sidebarWidth"
          :changes="changes"
          :selected-path="selectedChange ? selectedChange.path : null"
          :is-repo="isRepo"
          :loading="loading"
          @refresh="refresh"
          @select="selectChange"
          @open-file="openFile"
          @revert="revertFile"
          @revert-all="confirmRevertAll"
        />

        <div class="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors shrink-0" @mousedown="startResize"></div>

        <diff-viewer
          :change="selectedChange"
          :diff-content="diffContent"
          :loading="diffLoading"
          @open-file="openFile"
          @revert="revertFile"
        />
      </div>

      <file-viewer-modal ref="fileModalRef" />

      <confirm-dialog
        :visible="confirmDialog.visible"
        :message="confirmDialog.message"
        @confirm="executeConfirm"
        @cancel="cancelConfirm"
      />
    </div>
  </div>
</template>

<script>
import { api } from '../../../api'
import GitChangesSidebar from '../git/GitChangesSidebar.vue'
import DiffViewer from '../file/DiffViewer.vue'
import FileViewerModal from '../file/FileViewerModal.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'

export default {
  name: 'GitChangesDialog',
  components: {
    GitChangesSidebar,
    DiffViewer,
    FileViewerModal,
    ConfirmDialog
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isRepo: false,
      gitRoot: null,
      changes: [],
      selectedChange: null,
      diffContent: null,
      loading: false,
      diffLoading: false,
      sidebarWidth: 320,
      isResizing: false,
      confirmDialog: {
        visible: false,
        message: '',
        action: null,
        target: null
      }
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.init()
      }
    }
  },
  methods: {
    async init() {
      await this.checkRepo()
      await this.refreshChanges()
      if (this.changes.length > 0 && !this.selectedChange) {
        this.selectChange(this.changes[0])
      }
      document.addEventListener('mousemove', this.handleResize)
      document.addEventListener('mouseup', this.stopResize)
    },

    close() {
      this.$emit('update:visible', false)
      this.$emit('close')
      document.removeEventListener('mousemove', this.handleResize)
      document.removeEventListener('mouseup', this.stopResize)
    },

    async checkRepo() {
      try {
        const res = await api.gitIsRepo()
        this.isRepo = res.data?.isRepo || false
        this.gitRoot = res.data?.gitRoot || null
      } catch (e) {
        this.isRepo = false
      }
    },

    async refreshChanges() {
      if (!this.isRepo) return
      this.loading = true
      try {
        const res = await api.gitStatus()
        this.changes = res.data || []
        if (this.selectedChange) {
          const stillExists = this.changes.find(c => c.path === this.selectedChange.path)
          if (!stillExists) {
            this.selectedChange = null
            this.diffContent = null
          }
        }
      } catch (e) {
        console.error('Failed to get git status:', e)
        this.$message.error('获取变更列表失败')
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      await this.refreshChanges()
      if (this.selectedChange) {
        await this.loadDiff(this.selectedChange)
      }
    },

    selectChange(change) {
      this.selectedChange = change
      this.loadDiff(change)
    },

    async loadDiff(change) {
      this.diffLoading = true
      this.diffContent = null
      try {
        const res = await api.gitDiff(change.path, change.isNew)
        this.diffContent = res.data?.diff || ''
      } catch (e) {
        console.error('Failed to get diff:', e)
        this.diffContent = ''
      } finally {
        this.diffLoading = false
      }
    },

    async openFile(change) {
      const filePath = this.gitRoot
        ? `${this.gitRoot.replace(/\\/g, '/')}/${change.path}`
        : change.path
      this.$refs.fileModalRef?.open(filePath, change)
    },

    revertFile(change) {
      const action = change.isNew ? 'delete' : 'revert'
      const message = change.isNew
        ? `确定要删除未跟踪的文件 "${change.path}" 吗？`
        : `确定要撤销对 "${change.path}" 的修改吗？`
      this.confirmDialog = {
        visible: true,
        message,
        action,
        target: change
      }
    },

    confirmRevertAll() {
      if (this.changes.length === 0) return
      this.confirmDialog = {
        visible: true,
        message: `确定要撤销所有 ${this.changes.length} 个文件的变更吗？此操作不可恢复。`,
        action: 'revertAll',
        target: null
      }
    },

    cancelConfirm() {
      this.confirmDialog.visible = false
    },

    async executeConfirm() {
      const { action, target } = this.confirmDialog
      this.confirmDialog.visible = false
      try {
        if (action === 'revertAll') {
          await api.gitRevertAll()
          await api.gitDiscardUntracked()
          this.$message.success('所有变更已撤销')
        } else if (action === 'revert') {
          await api.gitRevert(target.path)
          this.$message.success('文件已撤销')
        } else if (action === 'delete') {
          await api.gitDeleteFile(target.path)
          this.$message.success('文件已删除')
        }
        await this.refreshChanges()
      } catch (e) {
        console.error('Operation failed:', e)
        this.$message.error('操作失败: ' + (e.message || '未知错误'))
      }
    },

    startResize(e) {
      this.isResizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },

    handleResize(e) {
      if (!this.isResizing) return
      const rect = this.$el.querySelector('.bg-sidebar')?.getBoundingClientRect()
      if (rect) {
        const newWidth = e.clientX - rect.left
        if (newWidth >= 200 && newWidth <= 500) {
          this.sidebarWidth = newWidth
        }
      }
    },

    stopResize() {
      this.isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }
}
</script>
