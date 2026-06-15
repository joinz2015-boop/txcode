<template>
  <el-dialog
    title="选择项目文件夹"
    :visible.sync="dialogVisible"
    width="600px"
    :close-on-click-modal="false"
    append-to-body
    @close="handleClose"
  >
    <div class="select-project-dialog">
      <div class="drive-nav" v-if="drives.length > 0">
        <el-button
          v-for="drive in drives"
          :key="drive.path"
          size="mini"
          :type="currentPath.startsWith(drive.path) ? 'primary' : ''"
          @click="selectDrive(drive.path)"
        >
          {{ drive.name }}
        </el-button>
      </div>

      <div class="file-list-container">
        <div class="current-path">
          <span class="path-label">当前路径:</span>
          <span class="path-value">{{ currentPath }}</span>
        </div>

        <div class="file-list" v-if="items.length > 0">
          <div
            class="file-item parent"
            @click="goToParent"
            v-if="parentPath"
          >
            <i class="fa-solid fa-arrow-up"></i>
            <span>上一级</span>
          </div>

          <div
            v-for="item in items.filter(i => i.is_directory)"
            :key="item.path"
            class="file-item"
            :class="{ selected: selectedPath === item.path }"
            @click="selectItem(item)"
            @dblclick="enterFolder(item)"
          >
            <i class="fa-solid fa-folder"></i>
            <span class="file-name">{{ item.name }}</span>
          </div>
        </div>

        <div class="empty-tip" v-else>
          <span>该目录为空</span>
        </div>
      </div>

      <div class="底部状态栏">
        <div class="selected-info">
          <span>已选择: {{ selectedPath || '未选择' }}</span>
        </div>
        <div class="project-name-input">
          <span>项目名称:</span>
          <el-input
            v-model="projectName"
            placeholder="请输入项目名称"
            size="small"
            style="width: 200px"
          />
        </div>
      </div>
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取 消</el-button>
      <el-button type="primary" @click="handleConfirm" :disabled="!selectedPath || !projectName" :loading="loading">
        确 定
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { api } from '../../../api/index.js'

export default {
  name: 'SelectProjectDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dialogVisible: false,
      drives: [],
      currentPath: '',
      parentPath: null,
      items: [],
      selectedPath: '',
      projectName: '',
      loading: false
    }
  },
  watch: {
    visible(val) {
      this.dialogVisible = val
      if (val) {
        this.loadDrives()
      }
    },
    dialogVisible(val) {
      this.$emit('update:visible', val)
    }
  },
  methods: {
    async loadDrives() {
      console.log('[SelectProjectDialog] loading drives...')
      try {
        const res = await api.getDrives()
        console.log('[SelectProjectDialog] drives response:', res)
        this.drives = res.data.items || []
        console.log('[SelectProjectDialog] drives:', this.drives)
        if (this.drives.length > 0) {
          const firstDrive = this.drives[0]
          console.log('[SelectProjectDialog] firstDrive:', firstDrive)
          await this.browse(firstDrive.path || '/')
        } else {
          // 无盘符时直接浏览根目录
          await this.browse('/')
        }
      } catch (e) {
        console.error('加载盘符失败:', e)
        this.$message.error('加载盘符失败: ' + e.message)
      }
    },
    async browse(path) {
      try {
        const res = await api.browseFilesystem(path)
        const data = res.data
        this.currentPath = data.current_path
        this.parentPath = data.parent_path
        this.items = data.items || []
      } catch (e) {
        console.error('浏览目录失败:', e)
        this.$message.error('浏览目录失败: ' + e.message)
      }
    },
    async selectDrive(path) {
      await this.browse(path)
    },
    selectItem(item) {
      if (item.is_directory) {
        this.selectedPath = item.path
        const pathParts = item.path.replace(/\\/g, '/').split('/')
        this.projectName = pathParts.filter(p => p).pop() || ''
      }
    },
    async enterFolder(item) {
      if (item.is_directory) {
        await this.browse(item.path)
      }
    },
    async goToParent() {
      if (this.parentPath) {
        await this.browse(this.parentPath)
      }
    },
    handleClose() {
      this.dialogVisible = false
      this.resetState()
    },
    resetState() {
      this.selectedPath = ''
      this.projectName = ''
      this.items = []
      this.currentPath = ''
      this.parentPath = null
    },
    async handleConfirm() {
      if (!this.selectedPath || !this.projectName) {
        return
      }

      this.loading = true
      try {
        const createRes = await api.createProject(
          this.projectName,
          this.selectedPath,
          ''
        )
        const projectId = createRes.data?.id
        if (projectId) {
          await api.setCurrentProject(projectId)
          this.$message.success('项目创建并切换成功')
          this.$emit('success', createRes.data)
          this.handleClose()
        }
      } catch (e) {
        console.error('创建项目失败:', e)
        this.$message.error('创建项目失败: ' + e.message)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style>
.select-project-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.select-project-dialog + .el-dialog {
  z-index: 2003 !important;
}
</style>

<style scoped>
.select-project-dialog {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.file-list-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
}

.current-path {
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 12px;
}

.path-label {
  color: #666;
}

.path-value {
  color: #333;
  word-break: break-all;
}

.file-list {
  padding: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.file-item:hover {
  background: #f0f0f0;
}

.file-item.selected {
  background: #e6f7ff;
  border: 1px solid #1890ff;
}

.file-item.parent {
  color: #666;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tip {
  padding: 40px;
  text-align: center;
  color: #999;
}

.底部状态栏 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.selected-info {
  color: #333;
}

.project-name-input {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>