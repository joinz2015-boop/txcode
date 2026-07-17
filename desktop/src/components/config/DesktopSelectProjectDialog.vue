<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择项目文件夹</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="drive-nav" v-if="drives.length > 0">
          <button
            v-for="drive in drives"
            :key="drive.path"
            class="drive-btn"
            :class="{ active: currentPath.startsWith(drive.path) }"
            @click="selectDrive(drive.path)"
          >
            {{ drive.name }}
          </button>
        </div>

        <div class="path-bar">
          <span class="path-label">当前路径:</span>
          <span class="path-value">{{ currentPath }}</span>
        </div>

        <div class="file-list">
          <div
            class="file-item parent"
            @click="goToParent"
            v-if="parentPath"
          >
            <span class="file-icon">&#x1F4C1;</span>
            <span class="file-name">..</span>
          </div>
          <div
            v-for="item in filteredItems"
            :key="item.path"
            class="file-item"
            :class="{ selected: selectedPath === item.path }"
            @click="selectItem(item)"
            @dblclick="enterFolder(item)"
          >
            <span class="file-icon">&#x1F4C1;</span>
            <span class="file-name">{{ item.name }}</span>
          </div>
          <div class="empty-hint" v-if="filteredItems.length === 0 && !parentPath">
            该目录为空
          </div>
        </div>

        <div class="bottom-bar">
          <div class="selected-info" v-if="selectedPath">
            已选择: {{ selectedPath }}
          </div>
          <div class="selected-info" v-else>
            未选择
          </div>
          <div class="name-input-wrap">
            <label class="name-label">项目名称:</label>
            <input
              class="name-input"
              v-model="projectName"
              placeholder="请输入项目名称"
            />
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="handleConfirm" :disabled="!selectedPath || !projectName || loading">
          {{ loading ? '创建中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { getDrives, browseFilesystem, createProject, setCurrentProject } from '@/api/index'

export default {
  name: 'DesktopSelectProjectDialog',
  emits: ['close', 'success'],
  data() {
    return {
      drives: [],
      currentPath: '',
      parentPath: null,
      items: [],
      selectedPath: '',
      projectName: '',
      loading: false
    }
  },
  computed: {
    filteredItems() {
      return this.items.filter(i => i.is_directory)
    }
  },
  methods: {
    async loadDrives() {
      try {
        const res = await getDrives()
        this.drives = (res.data && res.data.items) || []
        if (this.drives.length > 0) {
          await this.browse(this.drives[0].path)
        } else {
          await this.browse('/')
        }
      } catch (e) {
        console.error('加载盘符失败:', e)
        await this.browse('/')
      }
    },
    async browse(path) {
      try {
        const res = await browseFilesystem(path)
        const data = res.data || {}
        this.currentPath = data.current_path || path
        this.parentPath = data.parent_path
        this.items = data.items || []
      } catch (e) {
        console.error('浏览目录失败:', e)
        this.items = []
      }
    },
    async selectDrive(path) {
      await this.browse(path)
    },
    selectItem(item) {
      this.selectedPath = item.path
      const parts = item.path.replace(/\\/g, '/').split('/')
      this.projectName = parts.filter(p => p).pop() || ''
    },
    async enterFolder(item) {
      await this.browse(item.path)
    },
    async goToParent() {
      if (this.parentPath) {
        await this.browse(this.parentPath)
      }
    },
    async handleConfirm() {
      if (!this.selectedPath || !this.projectName) return
      this.loading = true
      try {
        const createRes = await createProject(this.projectName, this.selectedPath, '')
        const project = createRes.data
        if (project && project.id) {
          await setCurrentProject(project.id)
          this.$emit('success', project)
        }
      } catch (e) {
        console.error('创建项目失败:', e)
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.loadDrives()
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 600px; max-width: 90vw; max-height: 75vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 12px; }

.drive-nav {
  display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px;
}
.drive-btn {
  padding: 4px 10px; background: #f0f0f0; color: var(--text-secondary);
  border: 1px solid var(--border); border-radius: 4px; font-size: 11px;
  cursor: pointer; font-family: inherit; transition: all 0.15s;
}
.drive-btn:hover { border-color: var(--accent); color: var(--accent); }
.drive-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

.path-bar {
  padding: 6px 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 8px;
  font-size: 11px; display: flex; align-items: center; gap: 6px;
}
.path-label { color: var(--text-muted); flex-shrink: 0; }
.path-value { color: var(--text-primary); word-break: break-all; }

.file-list {
  border: 1px solid var(--border); border-radius: 6px; max-height: 260px;
  overflow-y: auto; padding: 4px;
}
.file-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px;
  cursor: pointer; font-size: 13px; color: var(--text-primary); transition: background 0.1s;
}
.file-item:hover { background: var(--bg-hover); }
.file-item.selected { background: var(--accent-light); border: 1px solid var(--accent); }
.file-item.parent { color: var(--text-muted); }
.file-icon { font-size: 14px; flex-shrink: 0; }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 30px; font-size: 13px; }

.bottom-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; background: #f5f5f5; border-radius: 4px; margin-top: 10px;
  font-size: 12px; gap: 12px;
}
.selected-info { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.name-input-wrap { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.name-label { color: var(--text-secondary); white-space: nowrap; }
.name-input {
  width: 160px; padding: 4px 8px; font-size: 12px; border: 1px solid var(--border);
  border-radius: 4px; color: var(--text-primary); background: #fff; outline: none; font-family: inherit;
}
.name-input:focus { border-color: var(--accent); }

.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:hover { background: var(--accent-hover, #3d57d9); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
