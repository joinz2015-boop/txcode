<template>
  <div class="workflow-sidebar">
    <div class="sidebar-header">
      <h3>当前项目</h3>
      <div class="project-display-row">
        <span class="label">大类</span>
        <span class="value">{{ currentCategory || '-' }}</span>
      </div>
      <div class="project-display-row">
        <span class="label">需求</span>
        <span class="value">{{ currentProject || '-' }}</span>
      </div>
    </div>

    <div class="step-list">
      <div
        v-for="step in visibleSteps"
        :key="step.id"
        :class="['step-item', {
          'active': currentStep === step.id,
          'completed': isStepCompleted(step.id)
        }]"
        @click="onStepClick(step.id)"
      >
        <div class="step-icon">
          <i :class="step.icon"></i>
        </div>
        <div class="step-info">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-desc">{{ step.desc }}</div>
        </div>
        <div class="step-status">
          <i v-if="isStepCompleted(step.id)" class="el-icon-circle-check" style="color: #22c55e;"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WorkflowSidebar',
  props: {
    categories: {
      type: Array,
      default: () => []
    },
    projects: {
      type: Object,
      default: () => {}
    },
    currentCategory: {
      type: String,
      default: ''
    },
    currentProject: {
      type: String,
      default: ''
    },
    currentStep: {
      type: Number,
      default: 1
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedCategory: '',
      selectedProject: '',
      steps: [
        { id: 1, title: '新建需求', desc: '创建新的需求项目', icon: 'el-icon-folder-add' },
        { id: 2, title: '方案设计', desc: '编写需求方案', icon: 'el-icon-edit' },
        { id: 3, title: '代码生成', desc: '根据方案生成代码', icon: 'el-icon-document' },
        { id: 4, title: '测试验收', desc: '测试验证功能', icon: 'el-icon-s-check' }
      ]
    }
  },
  computed: {
    hasAnyProject() {
      return Object.keys(this.projects || {}).length > 0
    },
    visibleSteps() {
      if (!this.hasAnyProject) {
        return this.steps.filter(step => step.id === 1)
      }
      return this.steps
    }
  },
  watch: {
    currentCategory(val) {
      this.selectedCategory = val
    },
    currentProject(val) {
      this.selectedProject = val
    }
  },
  methods: {
    onCategoryChange(cat) {
      this.selectedProject = ''
      this.$emit('category-change', cat)
    },
    onProjectChange(proj) {
      this.$emit('project-change', proj)
    },
    onStepClick(stepId) {
      this.$emit('step-change', stepId)
    },
    isStepCompleted(stepId) {
      if (!this.currentProject) return false
      const key = `${this.currentCategory}/${this.currentProject}`
      const project = this.projects[key]
      return project?.stepStatus?.[stepId] === true
    }
  }
}
</script>

<style scoped>
.workflow-sidebar {
  width: 280px;
  background: #2d2d2d;
  border-right: 1px solid #1e1e1e;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #1e1e1e;
}

.sidebar-header h3 {
  font-size: 14px;
  color: #84848a;
  margin-bottom: 12px;
}

.sidebar-header .el-select {
  width: 100%;
  margin-bottom: 8px;
}

.project-display-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #3f3f46;
  border-radius: 6px;
}

.project-display-row .label {
  color: #84848a;
  font-size: 12px;
}

.project-display-row .value {
  color: #d4d4d8;
  font-size: 12px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.step-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.step-item.active {
  background: rgba(64, 158, 255, 0.15);
  border-color: #409EFF;
}

.step-item.completed .step-icon {
  background: #22c55e;
}

.step-item.active .step-icon {
  background: #409EFF;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  color: #f4f4f5;
}

.step-desc {
  font-size: 12px;
  color: #84848a;
}

.step-status {
  font-size: 14px;
}
</style>
