<template>
  <div class="project-switcher-wrap">
    <div class="project-switcher" @click="toggleDropdown">
      <span class="project-dot"></span>
      <span>{{ currentProject.name }}</span>
      <span class="project-chevron">&#x25BC;</span>
    </div>
    <div class="project-dropdown" :class="{ show: dropdownVisible }">
      <div
        v-for="project in projects"
        :key="project.name"
        class="project-dropdown-item"
        :class="{ active: project.name === currentProject.name }"
        @click="selectProject(project)"
      >
        <span class="dot" :style="{ background: project.color || '#4f6ef7' }"></span>
        {{ project.name }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopProjectSwitcher',
  props: {
    currentProject: { type: Object, default: () => ({ name: 'txcode', path: '', color: '#4f6ef7' }) },
    projects: { type: Array, default: () => [] }
  },
  data() {
    return {
      dropdownVisible: false
    }
  },
  methods: {
    toggleDropdown() {
      this.dropdownVisible = !this.dropdownVisible
    },
    selectProject(project) {
      this.$emit('selectProject', project)
      this.dropdownVisible = false
    },
    handleClickOutside(e) {
      if (!this.$el.contains(e.target)) {
        this.dropdownVisible = false
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.project-switcher-wrap {
  position: relative;
}
.project-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  border: 1px solid var(--border);
  font-weight: 500;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.project-switcher:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79,110,247,0.06);
}
.project-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}
.project-chevron {
  font-size: 9px;
  color: var(--text-muted);
  margin-left: 2px;
}
.project-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.14);
  border: 1px solid var(--border);
  min-width: 200px;
  z-index: 100;
  display: none;
  overflow: hidden;
}
.project-dropdown.show {
  display: block;
}
.project-dropdown-item {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.1s;
}
.project-dropdown-item:hover {
  background: var(--bg-hover);
}
.project-dropdown-item.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 500;
}
.project-dropdown-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
