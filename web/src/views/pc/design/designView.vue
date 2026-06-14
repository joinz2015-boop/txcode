<template>
  <div class="flex-1 flex overflow-hidden">
    <DesignSidebar
      :base-path="designBasePath"
      @open-file="openFile"
      @file-changed="refreshCurrentFile"
      ref="sidebar"
    />

    <div class="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors" @mousedown="startResize"></div>

    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div class="flex border-b border-border bg-sidebar">
        <div class="flex items-center">
          <div
            class="px-4 py-2 cursor-pointer border-r border-border text-sm"
            :class="rightTab === 'preview' ? 'bg-[#1e1e1e] text-white border-t-2 border-t-accent' : 'text-textMuted hover:bg-[#2a2a2a]'"
            @click="rightTab = 'preview'"
          >
            <i class="fa-solid fa-eye mr-1"></i> 预览
          </div>
          <div
            class="px-4 py-2 cursor-pointer border-r border-border text-sm"
            :class="rightTab === 'editor' ? 'bg-[#1e1e1e] text-white border-t-2 border-t-accent' : 'text-textMuted hover:bg-[#2a2a2a]'"
            @click="rightTab = 'editor'"
          >
            <i class="fa-solid fa-code mr-1"></i> 编辑
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <DesignPreview
          v-show="rightTab === 'preview'"
          :file-content="fileContent"
          :file-name="activeFileName"
        />
        <DesignEditor
          v-show="rightTab === 'editor'"
          :file-content="fileContent"
          :file-name="activeFileName"
          :file-path="activeFilePath"
          @content-changed="onContentChanged"
          @content-saved="onContentSaved"
          ref="editor"
        />
      </div>

      <div class="h-8 bg-sidebar border-t border-border flex items-center justify-between px-3">
        <div class="flex items-center gap-4 text-xs text-textMuted">
          <span v-if="activeFilePath">{{ activeFilePath }}</span>
          <span v-else class="text-textMuted">双击左侧文件打开</span>
          <span v-if="hasChanges" class="text-yellow-500">已修改</span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="refreshCurrentFile" class="p-1 text-textMuted hover:text-white text-xs" title="刷新">
            <i class="fa-solid fa-refresh"></i>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import DesignSidebar from '../../../components/pc/design/DesignSidebar.vue'
import DesignPreview from '../../../components/pc/design/DesignPreview.vue'
import DesignEditor from '../../../components/pc/design/DesignEditor.vue'
import { api } from '../../../api/index.js'

export default {
  name: 'DesignView',
  components: { DesignSidebar, DesignPreview, DesignEditor },
  data() {
    return {
      rightTab: 'preview',
      designBasePath: '.txcode/design',
      fileContent: '',
      activeFileName: '',
      activeFilePath: '',
      hasChanges: false,
      isResizing: false,
    }
  },
  mounted() {
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
  },
  watch: {
    rightTab(val) {
      if (val === 'editor') {
        this.$nextTick(() => {
          if (this.$refs.editor) this.$refs.editor.layout()
        })
      }
    }
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
  },
  methods: {
    async openFile(node) {
      if (node.is_directory) return
      this.activeFileName = node.name
      this.activeFilePath = node.path
      try {
        const res = await api.getFileContent(node.path)
        this.fileContent = res.data?.content || ''
        this.hasChanges = false
        this.rightTab = 'preview'
      } catch (e) {
        console.error('Open file failed:', e)
        this.fileContent = ''
      }
    },
    onContentChanged(changed) {
      this.hasChanges = changed
    },
    onContentSaved(content) {
      this.fileContent = content
      this.hasChanges = false
    },
    async refreshCurrentFile() {
      if (!this.activeFilePath) return
      try {
        const res = await api.getFileContent(this.activeFilePath)
        this.fileContent = res.data?.content || ''
        if (this.$refs.editor) {
          this.$refs.editor.updateContent(this.fileContent)
        }
      } catch (e) {
        console.error('Refresh file failed:', e)
      }
    },
    startResize(e) {
      this.isResizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    handleResize(e) {
      if (!this.isResizing) return
      const sidebar = this.$refs.sidebar
      if (!sidebar) return
      const newWidth = e.clientX
      if (newWidth >= 150 && newWidth <= 500) {
        sidebar.$el.style.width = newWidth + 'px'
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
