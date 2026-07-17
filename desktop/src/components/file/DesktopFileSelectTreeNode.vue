<template>
  <div class="tree-node">
    <div
      class="node-row"
      :style="{ paddingLeft: (level * 16 + 4) + 'px' }"
      :class="{ selected: isSelected, 'is-dir': node.isDirectory }"
      @click="handleClick"
      @dblclick="handleDblClick"
    >
      <span class="expand-icon" v-if="node.isDirectory" @click.stop="toggleExpand">
        <span v-if="loading" class="spinner"></span>
        <span v-else-if="expanded">▼</span>
        <span v-else>▶</span>
      </span>
      <span class="expand-icon placeholder" v-else></span>
      <span class="node-icon">{{ node.isDirectory ? '📁' : '📄' }}</span>
      <span class="node-name">{{ node.name }}</span>
    </div>
    <div v-if="node.isDirectory && expanded && loadedChildren.length > 0" class="children">
      <DesktopFileSelectTreeNode
        v-for="child in loadedChildren"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :selectedPath="selectedPath"
        :expandedPaths="expandedPaths"
        @select="$emit('select', $event)"
        @open-file="$emit('open-file', $event)"
        @load-children="$emit('load-children', $event)"
        @expand-path="$emit('expand-path', $event)"
        @collapse-path="$emit('collapse-path', $event)"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopFileSelectTreeNode',
  props: {
    node: { type: Object, required: true },
    level: { type: Number, default: 0 },
    selectedPath: { type: String, default: '' },
    expandedPaths: { type: Set, default: () => new Set() }
  },
  data() {
    return {
      expanded: false,
      loading: false,
      loadedChildren: []
    }
  },
  computed: {
    isSelected() {
      return this.selectedPath === this.node.path
    }
  },
  watch: {
    node: {
      immediate: true,
      handler(newNode) {
        if (newNode.children && newNode.children.length > 0) {
          this.loadedChildren = newNode.children
        }
      }
    },
    expandedPaths: {
      immediate: true,
      handler(paths) {
        if (!this.node.isDirectory) return
        const nodePath = (this.node.path || '').replace(/\\/g, '/')
        if (paths.has(nodePath) && !this.expanded) {
          this.ensureExpanded()
        } else if (!paths.has(nodePath) && this.expanded) {
          this.expanded = false
        }
      }
    }
  },
  methods: {
    handleClick() {
      this.$emit('select', this.node)
      if (this.node.isDirectory) {
        this.toggleExpand()
      }
    },
    handleDblClick() {
      if (!this.node.isDirectory) {
        this.$emit('open-file', this.node)
      } else {
        this.toggleExpand()
      }
    },
    async toggleExpand() {
      if (!this.node.isDirectory) return
      if (!this.expanded && this.loadedChildren.length === 0) {
        this.loading = true
        this.$emit('load-children', {
          path: this.node.path,
          callback: (children) => {
            this.loadedChildren = children
            this.expanded = true
            this.loading = false
            this.$emit('expand-path', this.node.path)
          }
        })
      } else {
        this.expanded = !this.expanded
        if (this.expanded) {
          this.$emit('expand-path', this.node.path)
        } else {
          this.$emit('collapse-path', this.node.path)
        }
      }
    },
    ensureExpanded() {
      if (this.expanded) return
      if (this.loadedChildren.length === 0 && this.node.hasChildren) {
        this.loading = true
        this.$emit('load-children', {
          path: this.node.path,
          callback: (children) => {
            this.loadedChildren = children
            this.expanded = true
            this.loading = false
          }
        })
      } else {
        this.expanded = true
      }
    }
  }
}
</script>

<style scoped>
.tree-node { user-select: none; }
.node-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  transition: background 0.1s;
  font-size: 13px;
  color: var(--text-primary);
}
.node-row:hover { background: var(--bg-hover); }
.node-row.selected { background: var(--accent-light); color: var(--accent); }
.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 9px;
  color: var(--text-muted);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.expand-icon.placeholder { visibility: hidden; }
.node-icon { margin: 0 6px; flex-shrink: 0; font-size: 14px; }
.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spinner {
  display: inline-block;
  width: 10px; height: 10px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.children { }
</style>
