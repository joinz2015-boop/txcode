<template>
  <div class="deploy-container">
    <div v-if="loading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-textMuted"></i>
    </div>

    <template v-else-if="releaseExists">
      <div class="deploy-main">
        <DeployEditor
          ref="editorRef"
          :content="releaseContent"
          :file-path="releasePath"
          @content-change="onContentChange"
        />
        <DeployAssistant
          ref="assistantRef"
          :has-content="!!editorContent"
          :doc-content="editorContent"
          :project-path="projectPath"
          :release-path="releasePath"
        />
      </div>
    </template>

    <template v-else>
      <DeployImport
        :project-path="projectPath"
        @imported="onImported"
      />
    </template>
  </div>
</template>

<script>
import { deployApi } from '../../api/deploy/deployApi'
import { api } from '../../api'
import DeployEditor from '../../components/deploy/DeployEditor.vue'
import DeployAssistant from '../../components/deploy/DeployAssistant.vue'
import DeployImport from '../../components/deploy/DeployImport.vue'

export default {
  name: 'deployView',
  components: { DeployEditor, DeployAssistant, DeployImport },
  data() {
    return {
      loading: true,
      releaseExists: false,
      releaseContent: '',
      releasePath: '',
      editorContent: '',
      projectPath: ''
    }
  },
  async mounted() {
    await this.loadProjectPath()
    await this.checkRelease()
  },
  methods: {
    async loadProjectPath() {
      try {
        const res = await api.getCurrentProject()
        if (res.data && res.data.path) {
          this.projectPath = res.data.path
        }
      } catch (e) {
        console.error('获取项目路径失败:', e)
      }
    },
    async checkRelease() {
      this.loading = true
      try {
        const res = await deployApi.checkRelease(this.projectPath)
        if (res.data && res.data.exists) {
          this.releaseExists = true
          this.releaseContent = res.data.content || ''
          this.editorContent = this.releaseContent
          this.releasePath = res.data.path || ''
        } else {
          this.releaseExists = false
        }
      } catch (e) {
        console.error('检查部署文档失败:', e)
        this.releaseExists = false
      } finally {
        this.loading = false
      }
    },
    onContentChange(content) {
      this.editorContent = content
    },
    onImported() {
      this.checkRelease()
    }
  }
}
</script>

<style scoped>
.deploy-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a09;
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.deploy-main {
  display: flex;
  flex: 1;
  gap: 16px;
  overflow: hidden;
  padding: 16px;
}
</style>
