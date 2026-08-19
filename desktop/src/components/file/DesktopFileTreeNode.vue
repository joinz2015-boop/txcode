<template>
  <div v-if="match" class="tree-node">
    <div
      class="tree-row"
      :class="{ selected: isSelected, 'new-row': false }"
      :style="{ paddingLeft: (level * 14 + 4) + 'px' }"
      @click="onClick"
      @contextmenu.prevent="onContextMenu"
    >
      <template v-if="isRenaming">
        <input
          ref="editInput"
          v-model="editName"
          class="tree-edit"
          @keydown.enter="commit"
          @keydown.esc="cancel"
          @blur="cancel"
        />
      </template>
      <template v-else>
        <span class="chev-slot" v-html="chevronHtml"></span>
        <span class="f-icon" v-html="iconHtml"></span>
        <span class="f-name" v-html="nameHtml"></span>
      </template>
    </div>

    <div v-if="node.type === 'dir' && node.expanded" class="tree-children">
      <DesktopFileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
      />
      <div v-if="isNewParent" class="tree-row new-row" :style="{ paddingLeft: ((level + 1) * 14 + 4) + 'px' }">
        <input
          ref="newInput"
          v-model="newName"
          class="tree-edit"
          :placeholder="editing.mode === 'dir' ? '文件夹名称' : '文件名'"
          @keydown.enter="commit"
          @keydown.esc="cancel"
          @blur="cancel"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { folderSvg, fileSvg, chevronSvg } from './fileIcons'

export default {
  name: 'DesktopFileTreeNode',
  inject: ['fileManager'],
  props: {
    node: { type: Object, required: true },
    level: { type: Number, default: 0 }
  },
  data() {
    return {
      editName: '',
      newName: ''
    }
  },
  computed: {
    isSelected() {
      return this.fileManager.state.selectedPath === this.node.path
    },
    match() {
      return this.fileManager.nodeMatches(this.node, this.fileManager.state.searchTerm)
    },
    isRenaming() {
      const ed = this.fileManager.state.editing
      return !!(ed && ed.mode === 'rename' && ed.node === this.node)
    },
    isNewParent() {
      const ed = this.fileManager.state.editing
      return !!(ed && ed.mode !== 'rename' && ed.parent === this.node)
    },
    editing() {
      return this.fileManager.state.editing || {}
    },
    chevronHtml() {
      if (this.node.type === 'dir') {
        return chevronSvg(!!this.node.expanded, false)
      }
      return chevronSvg(false, true)
    },
    iconHtml() {
      if (this.node.type === 'dir') {
        return folderSvg(!!this.node.expanded)
      }
      return fileSvg(this.node.name)
    },
    nameHtml() {
      const term = this.fileManager.state.searchTerm
      return this.fileManager.highlightMatch(this.node.name, term)
    }
  },
  watch: {
    'fileManager.state.editing': {
      handler(val) {
        if (val && val.mode === 'rename' && val.node === this.node) {
          this.editName = this.node.name
        } else if (val && val.mode !== 'rename' && val.parent === this.node) {
          this.newName = ''
        }
        this.$nextTick(() => {
          const el = this.$refs.editInput || this.$refs.newInput
          if (el) {
            el.focus()
            el.select()
          }
        })
      }
    }
  },
  methods: {
    onClick() {
      if (this.isRenaming) return
      this.fileManager.selectNode(this.node)
    },
    onContextMenu(e) {
      if (this.isRenaming) return
      this.fileManager.state.selectedPath = this.node.path
      this.$emit('contextmenu', { event: e, node: this.node })
    },
    commit() {
      const ed = this.fileManager.state.editing
      if (!ed) return
      const name = ed.mode === 'rename' ? this.editName : this.newName
      this.fileManager.commitEdit(name)
    },
    cancel() {
      const ed = this.fileManager.state.editing
      if (!ed) return
      this.fileManager.cancelEdit()
    }
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}
.tree-row {
  display: flex;
  align-items: center;
  height: 22px;
  padding-right: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  gap: 0;
}
.tree-row:hover {
  background: var(--bg-hover);
}
.tree-row.selected {
  background: var(--accent-light);
}
.tree-row.selected :deep(.f-name) {
  color: var(--accent);
  font-weight: 500;
}
.tree-row.selected :deep(.hl-match) {
  color: var(--accent);
}
.tree-row.new-row {
  color: var(--text-secondary);
  font-style: italic;
}
.chev-slot {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.chev-slot :deep(.chev) {
  transition: transform 0.12s;
}
.chev-slot :deep(.chev.open) {
  transform: rotate(90deg);
}
.chev-slot :deep(.chev.placeholder) {
  visibility: hidden;
}
.f-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 4px 0 2px;
}
.f-name {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.f-name :deep(.hl-match) {
  background: rgba(245, 158, 11, 0.25);
  border-radius: 2px;
}
.tree-edit {
  flex: 1;
  min-width: 0;
  height: 18px;
  margin-right: 6px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 0 4px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  background: #fff;
  color: var(--text-primary);
}
</style>
