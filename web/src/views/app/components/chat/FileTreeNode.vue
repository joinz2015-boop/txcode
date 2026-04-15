<template>
  <div class="file-tree-node">
    <div
      class="node-row"
      :class="{ selected: selectedPath === node.path }"
      @click="handleClick"
    >
      <span class="expand-icon" v-if="node.is_directory" @click.stop="toggleExpand">
        <i v-if="node.loading" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else-if="node.expanded" class="fa-solid fa-chevron-down"></i>
        <i v-else class="fa-solid fa-chevron-right"></i>
      </span>
      <span class="expand-icon placeholder" v-else></span>
      <span class="node-icon">
        <i :class="getFileIcon(node.name, node.is_directory)"></i>
      </span>
      <span class="node-name">{{ node.name }}</span>
    </div>
    <div v-if="node.is_directory && node.expanded && node.children && node.children.length > 0" class="node-children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected-path="selectedPath"
        @load-children="handleLoadChildren"
        @select-node="handleSelectNode"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileTreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    selectedPath: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false
    }
  },
  methods: {
    async toggleExpand() {
      if (!this.node.is_directory) return

      if (!this.node.expanded && this.node.children.length === 0) {
        this.node.loading = true
        this.$emit('load-children', this.node)
      } else {
        this.node.expanded = !this.node.expanded
      }
    },

    handleClick() {
      if (this.node.is_directory) {
        this.toggleExpand()
      } else {
        this.$emit('select-node', this.node)
      }
    },

    handleLoadChildren(node) {
      this.$emit('load-children', node)
    },

    handleSelectNode(node) {
      this.$emit('select-node', node)
    },

    getFileIcon(name, isDir) {
      if (isDir) return 'fa-solid fa-folder'

      const ext = name.split('.').pop().toLowerCase()
      const nameLower = name.toLowerCase()

      const iconMap = {
        js: 'fa-brands fa-js',
        jsx: 'fa-brands fa-react',
        ts: 'fa-brands fa-js',
        tsx: 'fa-brands fa-react',
        vue: 'fa-brands fa-vuejs',
        py: 'fa-brands fa-python',
        html: 'fa-brands fa-html5',
        htm: 'fa-brands fa-html5',
        css: 'fa-brands fa-css3',
        scss: 'fa-brands fa-sass',
        json: 'fa-solid fa-file-code',
        yaml: 'fa-solid fa-file-code',
        yml: 'fa-solid fa-file-code',
        md: 'fa-solid fa-file-lines',
        sql: 'fa-solid fa-database',
        sh: 'fa-solid fa-terminal',
        go: 'fa-brands fa-golang',
        java: 'fa-brands fa-java',
        dockerfile: 'fa-brands fa-docker'
      }

      if (nameLower === 'dockerfile') return 'fa-brands fa-docker'
      if (nameLower === '.gitignore') return 'fa-brands fa-git'

      return iconMap[ext] || 'fa-solid fa-file'
    }
  }
}
</script>

<style scoped>
.file-tree-node {
  user-select: none;
}

.node-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 8px;
  cursor: pointer;
  color: var(--text-secondary, #d4d4d8);
}

.node-row:active {
  background: var(--bg-tertiary, #18191b);
}

.node-row.selected {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent, #3b82f6);
}

.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: var(--text-muted, #84848a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-icon.placeholder {
  visibility: hidden;
}

.expand-icon i {
  font-size: 10px;
}

.node-icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--accent, #3b82f6);
}

.node-row:not(.selected) .node-icon:not([class*="fa-folder"]) {
  color: var(--text-muted, #84848a);
}

.node-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #f4f4f5);
}

.node-children {
  margin-left: 16px;
}
</style>
