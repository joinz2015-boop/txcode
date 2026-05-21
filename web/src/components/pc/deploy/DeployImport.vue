<template>
  <div class="deploy-import">
    <div class="import-container">
      <div class="import-icon">
        <i class="fa-solid fa-cloud-arrow-down text-5xl text-textMuted opacity-50"></i>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">未找到部署文档</h2>
      <p class="text-textMuted mb-8">请导入部署文档到 .txcode/release/ 目录</p>

      <div class="import-card">
        <div class="import-card-title">
          <i class="fa-solid fa-link"></i> 输入链接下载部署文档
        </div>
        <div class="import-card-body">
          <div class="flex gap-2">
            <el-input
              v-model="downloadUrl"
              placeholder="https://..."
              class="flex-1"
              :disabled="downloading"
            />
            <el-button
              type="primary"
              :loading="downloading"
              :disabled="!downloadUrl.trim()"
              @click="handleDownload"
            >
              {{ downloading ? '下载中...' : '下载' }}
            </el-button>
          </div>
        </div>
      </div>

      <div class="import-divider">
        <span>—— 或 ——</span>
      </div>

      <div class="import-card">
        <div class="import-card-title">
          <i class="fa-solid fa-upload"></i> 选择压缩包上传(tar.gz / zip)
        </div>
        <div class="import-card-body">
          <el-upload
            drag
            :auto-upload="false"
            :show-file-list="true"
            accept=".tar.gz,.tgz,.zip"
            :on-change="handleFileChange"
            :file-list="fileList"
            :limit="1"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">将 tar.gz / zip 文件拖到此处，或<em>点击上传</em></div>
            <div class="el-upload__tip" slot="tip">上传后自动解压到 .txcode/release/ 目录</div>
          </el-upload>
        </div>
      </div>

      <div v-if="statusMessage" class="import-status" :class="statusType">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { deployApi } from '../../../api/deploy/deployApi'

export default {
  name: 'DeployImport',
  props: {
    projectPath: { type: String, default: '' }
  },
  data() {
    return {
      downloadUrl: '',
      downloading: false,
      fileList: [],
      statusMessage: '',
      statusType: 'info'
    }
  },
  methods: {
    async handleDownload() {
      if (!this.downloadUrl.trim()) return
      this.downloading = true
      this.statusMessage = ''
      try {
        const res = await deployApi.downloadUrl(this.downloadUrl.trim(), this.projectPath)
        this.statusMessage = '部署文档已导入成功！'
        this.statusType = 'success'
        this.$emit('imported', res.data)
      } catch (e) {
        this.statusMessage = '下载失败: ' + e.message
        this.statusType = 'error'
      } finally {
        this.downloading = false
      }
    },
    async handleFileChange(file) {
      this.statusMessage = ''
      try {
        const res = await deployApi.uploadArchive(file.raw, this.projectPath)
        this.statusMessage = '部署文档已导入成功！'
        this.statusType = 'success'
        this.fileList = []
        this.$emit('imported', res.data)
      } catch (e) {
        this.statusMessage = '上传失败: ' + e.message
        this.statusType = 'error'
      }
    }
  }
}
</script>

<style scoped>
.deploy-import {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex: 1;
}
.import-container {
  text-align: center;
  max-width: 520px;
  width: 100%;
  padding: 40px;
}
.import-icon {
  margin-bottom: 16px;
}
.import-card {
  background: #121212;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: left;
}
.import-card-title {
  background: #121212;
  border-bottom: 1px solid #1e1e1e;
  padding: 12px 16px;
  font-size: 14px;
  color: #f4f4f5;
  display: flex;
  align-items: center;
  gap: 8px;
}
.import-card-body {
  padding: 16px;
}
.import-divider {
  display: flex;
  align-items: center;
  color: #84848a;
  margin: 16px 0;
}
.import-divider::before,
.import-divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid #1e1e1e;
}
.import-divider span {
  padding: 0 16px;
  font-size: 13px;
}
.import-status {
  margin-top: 16px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
}
.import-status.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.import-status.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>
