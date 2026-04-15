<template>
  <div class="step1-req">
    <div class="category-section">
      <div class="section-header">
        <span>选择大类</span>
      </div>
      <div class="category-list">
        <div
          v-for="cat in categories"
          :key="cat"
          class="category-item"
          :class="{ active: selectedCategory === cat }"
          @click="selectCategory(cat)"
        >
          <i class="fa-solid fa-folder"></i>
          <span>{{ cat }}</span>
        </div>
        <div class="category-item add-btn" @click="showCreateCategoryDialog">
          <i class="fa-solid fa-plus"></i>
          <span>新建大类</span>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="project-section">
      <div class="section-header">
        <span>选择需求</span>
        <button class="btn-primary" @click="showCreateRequirementDialog" :disabled="!selectedCategory">
          <i class="fa-solid fa-plus"></i> 新建
        </button>
      </div>
      <div class="project-list">
        <div
          v-for="req in requirementList"
          :key="req"
          class="project-item"
          @click="selectProject(req)"
        >
          <div class="project-info">
            <i class="fa-solid fa-folder-open"></i>
            <span>{{ req }}</span>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </div>
        <div v-if="!requirementList.length && selectedCategory" class="empty-hint">
          暂无需求，请点击新建
        </div>
        <div v-if="!selectedCategory" class="empty-hint">
          请先选择大类
        </div>
      </div>
    </div>

    <div v-if="dialogVisible" class="dialog-overlay" @click.self="dialogVisible = false">
      <div class="dialog">
        <div class="dialog-header">
          <span>新建大类</span>
          <button class="close-btn" @click="dialogVisible = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="dialog-body">
          <input
            v-model="dialogInput"
            type="text"
            placeholder="输入大类名称"
            @keydown.enter="handleDialogConfirm"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="dialogVisible = false">取消</button>
          <button class="btn-confirm" @click="handleDialogConfirm">确定</button>
        </div>
      </div>
    </div>

    <div v-if="requirementDialogVisible" class="dialog-overlay" @click.self="requirementDialogVisible = false">
      <div class="dialog">
        <div class="dialog-header">
          <span>新建需求</span>
          <button class="close-btn" @click="requirementDialogVisible = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="dialog-body">
          <input
            v-model="requirementDialogInput"
            type="text"
            placeholder="输入需求名称"
            @keydown.enter="handleCreateRequirementConfirm"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="requirementDialogVisible = false">取消</button>
          <button class="btn-confirm" @click="handleCreateRequirementConfirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../../api'

export default {
  name: 'AppStep1Req',
  props: {
    categories: {
      type: Array,
      default: () => []
    },
    projects: {
      type: Object,
      default: () => ({})
    },
    reqBasePath: {
      type: String,
      default: ''
    },
    currentCategory: {
      type: String,
      default: ''
    },
    currentProject: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      selectedCategory: '',
      selectedProject: '',
      dialogVisible: false,
      dialogInput: '',
      requirementDialogVisible: false,
      requirementDialogInput: ''
    }
  },
  computed: {
    requirementList() {
      if (!this.selectedCategory) return []
      const prefix = `${this.selectedCategory}/`
      return Object.keys(this.projects)
        .filter(key => key.startsWith(prefix))
        .map(key => key.split('/')[1])
        .sort()
    }
  },
  watch: {
    currentCategory: {
      immediate: true,
      handler(val) {
        this.selectedCategory = val || ''
      }
    },
    currentProject: {
      immediate: true,
      handler(val) {
        this.selectedProject = val || ''
      }
    },
    selectedCategory(val) {
      if (!val) {
        this.selectedProject = ''
      }
    }
  },
  methods: {
    selectCategory(cat) {
      this.selectedCategory = cat
      this.$emit('category-change', cat)
      this.$emit('project-change', '')
    },
    selectProject(req) {
      this.selectedProject = req
      this.$emit('project-change', req)
    },
    showCreateCategoryDialog() {
      this.dialogInput = ''
      this.dialogVisible = true
    },
    handleDialogConfirm() {
      const value = this.dialogInput.trim()
      if (!value) return
      this.$emit('create-category', value)
      this.dialogVisible = false
    },
    showCreateRequirementDialog() {
      if (!this.selectedCategory) return
      this.requirementDialogInput = ''
      this.requirementDialogVisible = true
    },
    handleCreateRequirementConfirm() {
      const name = this.requirementDialogInput.trim()
      if (!name) return
      if (this.requirementList.includes(name)) return
      this.$emit('create-requirement', {
        category: this.selectedCategory,
        name
      })
      this.requirementDialogVisible = false
    }
  }
}
</script>

<style scoped>
.step1-req {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a09;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
}

.category-section {
  background: #121212;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 16px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #1e1e1e;
  border-radius: 20px;
  font-size: 13px;
  color: #a1a1aa;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: #27272a;
  color: #f4f4f5;
}

.category-item.active {
  background: #3b82f6;
  color: white;
}

.category-item.add-btn {
  background: transparent;
  border: 1px dashed #3f3f46;
}

.category-item.add-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.divider {
  height: 1px;
  background: #27272a;
}

.project-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.project-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #121212;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-item:hover {
  background: #1e1e1e;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f4f4f5;
  font-size: 14px;
}

.project-info i {
  color: #3b82f6;
}

.project-item > i {
  color: #52525b;
  font-size: 12px;
}

.empty-hint {
  text-align: center;
  color: #52525b;
  font-size: 13px;
  padding: 32px 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog {
  width: 100%;
  max-width: 320px;
  background: #18181b;
  border-radius: 12px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #27272a;
  font-size: 15px;
  font-weight: 500;
  color: #f4f4f5;
}

.close-btn {
  background: none;
  border: none;
  color: #71717a;
  font-size: 18px;
  cursor: pointer;
}

.dialog-body {
  padding: 16px;
}

.dialog-body input {
  width: 100%;
  padding: 12px;
  background: #0a0a09;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 14px;
  outline: none;
}

.dialog-body input:focus {
  border-color: #3b82f6;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #27272a;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #27272a;
  border: none;
  color: #a1a1aa;
}

.btn-cancel:hover {
  background: #3f3f46;
}

.btn-confirm {
  background: #3b82f6;
  border: none;
  color: white;
}

.btn-confirm:hover {
  background: #2563eb;
}
</style>
