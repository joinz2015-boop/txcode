<template>
  <div class="page-tree">
    <div class="tree-toolbar">
      <button class="tree-toolbar-btn" @click="refresh" title="刷新">↻</button>
      <button class="tree-toolbar-btn" @click="createRootFolder" title="新建文件夹">📁+</button>
    </div>

    <div class="tree-body">
      <div v-if="loading" class="tree-loading">加载中...</div>
      <div v-else-if="treeNodes.length === 0" class="tree-empty">
        <div class="tree-empty-icon">📂</div>
        <p>设计目录为空</p>
        <p class="tree-empty-hint">右键文件夹创建网页</p>
      </div>
      <template v-else>
        <DesktopFileSelectTreeNode
          v-for="node in treeNodes"
          :key="node.path"
          :node="node"
          :level="0"
          :selectedPath="selectedPath"
          :expandedPaths="expandedPaths"
          @select="handleSelect"
          @open-file="handleOpenFile"
          @load-children="handleLoadChildren"
          @expand-path="onExpandPath"
          @collapse-path="onCollapsePath"
          @contextmenu="showContextMenu"
        />
      </template>
    </div>

    <div
      v-show="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <template v-if="contextMenu.target && contextMenu.target.isDirectory">
        <button @click="createNewPage" class="context-menu-item">📄 新建网页</button>
        <button @click="createNewFolder" class="context-menu-item">📁 新建文件夹</button>
        <div class="context-menu-sep"></div>
        <button @click="renameItem" class="context-menu-item">✏ 重命名</button>
        <button @click="exportFolder" class="context-menu-item">📦 导出</button>
        <button @click="deleteItem" class="context-menu-item danger">🗑 删除</button>
      </template>
      <template v-else>
        <button v-if="contextMenu.target && isHtmlFile(contextMenu.target)" @click="previewFile" class="context-menu-item">👁 预览</button>
        <button v-if="contextMenu.target && isHtmlFile(contextMenu.target)" @click="switchToAiDesign" class="context-menu-item">🤖 AI设计</button>
        <div v-if="contextMenu.target && isHtmlFile(contextMenu.target)" class="context-menu-sep"></div>
        <button @click="copyFilePath" class="context-menu-item">📋 复制路径</button>
        <button @click="downloadFile" class="context-menu-item">⬇ 下载</button>
        <button @click="renameItem" class="context-menu-item">✏ 重命名</button>
        <button @click="deleteItem" class="context-menu-item danger">🗑 删除</button>
      </template>
    </div>

    <div v-show="renameDialog.visible" class="dialog-overlay" @click.self="cancelRename">
      <div class="dialog-box">
        <p class="dialog-title">{{ renameDialog.title }}</p>
        <input
          ref="renameInput"
          v-model="renameDialog.value"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          class="dialog-input"
          :placeholder="renameDialog.placeholder"
        />
        <div class="dialog-actions">
          <button @click="cancelRename" class="dialog-btn">取消</button>
          <button @click="confirmRename" class="dialog-btn primary">确定</button>
        </div>
      </div>
    </div>

    <div v-show="newPageDialog.visible" class="dialog-overlay" @click.self="cancelNewPage">
      <div class="dialog-box">
        <p class="dialog-title">新建网页</p>
        <div class="dialog-field">
          <label class="dialog-label">名称</label>
          <input
            ref="newPageNameInput"
            v-model="newPageDialog.name"
            @keyup.enter="confirmNewPage"
            @keyup.escape="cancelNewPage"
            class="dialog-input"
            placeholder="输入网页名称"
          />
        </div>
        <div class="dialog-field">
          <label class="dialog-label">类型</label>
          <div class="device-types">
            <label class="device-type" :class="{ active: newPageDialog.pageType === 'app' }">
              <input type="radio" v-model="newPageDialog.pageType" value="app" /> App
            </label>
            <label class="device-type" :class="{ active: newPageDialog.pageType === 'web' }">
              <input type="radio" v-model="newPageDialog.pageType" value="web" /> Web
            </label>
            <label class="device-type" :class="{ active: newPageDialog.pageType === 'pad' }">
              <input type="radio" v-model="newPageDialog.pageType" value="pad" /> Pad
            </label>
          </div>
        </div>
        <div class="dialog-preview-filename">
          文件名预览：{{ newPagePreviewName }}
        </div>
        <div class="dialog-actions">
          <button @click="cancelNewPage" class="dialog-btn">取消</button>
          <button @click="confirmNewPage" class="dialog-btn primary" :disabled="!newPageDialog.name.trim()">确定</button>
        </div>
      </div>
    </div>

    <div v-show="deleteDialog.visible" class="dialog-overlay" @click.self="cancelDelete">
      <div class="dialog-box dialog-sm">
        <p class="dialog-title">确认删除</p>
        <p class="dialog-msg">确定要删除 "<strong>{{ deleteDialog.name }}</strong>" 吗？</p>
        <p class="dialog-warn">此操作不可恢复</p>
        <div class="dialog-actions">
          <button @click="cancelDelete" class="dialog-btn">取消</button>
          <button @click="confirmDelete" class="dialog-btn danger-btn">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { browseFilesystem, getFileContent, writeFile, createDirectory, deleteFile, renameFile, exportFolder } from '@/api/index'
import DesktopFileSelectTreeNode from '@/components/file/DesktopFileSelectTreeNode.vue'

const DESIGN_BASE = '.txcode/design'

export default {
  name: 'DesktopDesignPageTree',
  components: { DesktopFileSelectTreeNode },
  props: {
    basePath: { type: String, default: DESIGN_BASE }
  },
  data() {
    return {
      treeNodes: [],
      loading: false,
      selectedPath: '',
      expandedPaths: new Set(),
      contextMenu: { visible: false, x: 0, y: 0, target: null },
      renameDialog: { visible: false, title: '', value: '', placeholder: '', target: null, action: 'rename' },
      newPageDialog: { visible: false, name: '', pageType: 'web', targetPath: '' },
      deleteDialog: { visible: false, name: '', target: null }
    }
  },
  computed: {
    newPagePreviewName() {
      const n = this.newPageDialog.name.trim() || 'untitled'
      return n + '_' + this.newPageDialog.pageType + '.html'
    }
  },
  async mounted() {
    await this.loadTree()
    document.addEventListener('click', this.hideContextMenu)
    document.addEventListener('keydown', this.onGlobalKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu)
    document.removeEventListener('keydown', this.onGlobalKeydown)
  },
  methods: {
    isHtmlFile(node) {
      return node && node.name && node.name.endsWith('.html')
    },

    async loadTree() {
      this.loading = true
      try {
        const res = await browseFilesystem(this.basePath)
        this.treeNodes = this.buildTreeNodes(res.data.items)
      } catch (e) {
        try {
          await createDirectory(this.basePath)
          const res = await browseFilesystem(this.basePath)
          this.treeNodes = this.buildTreeNodes(res.data.items)
        } catch (e2) {
          this.treeNodes = []
        }
      } finally {
        this.loading = false
      }
    },

    buildTreeNodes(items) {
      return (items || [])
        .filter(item => item.name !== 'session.json' && item.name !== '.template')
        .map(item => ({
          name: item.name,
          path: item.path,
          isDirectory: item.is_directory,
          hasChildren: item.is_directory
        }))
        .sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
          return a.isDirectory ? -1 : 1
        })
    },

    async refresh() {
      await this.loadTree()
      this.$emit('file-changed')
    },

    getRelativePath(fullPath) {
      const normalized = (fullPath || '').replace(/\\/g, '/')
      const prefix = this.basePath.replace(/\\/g, '/') + '/'
      const idx = normalized.indexOf(prefix)
      if (idx !== -1) return normalized.slice(idx + prefix.length)
      return ''
    },

    handleSelect(node) {
      this.selectedPath = node.path
      if (!node.isDirectory && node.name.endsWith('.html')) {
        this.$emit('current-page', this.getRelativePath(node.path))
      }
    },

    handleOpenFile(node) {
      this.selectedPath = node.path
      if (!node.isDirectory && node.name.endsWith('.html')) {
        const relPath = this.getRelativePath(node.path)
        this.$emit('current-page', relPath)
        this.$emit('open-file', { path: node.path, name: node.name, relativePath: relPath })
      }
    },

    async handleLoadChildren({ path, callback }) {
      try {
        const res = await browseFilesystem(path)
        callback(this.buildTreeNodes(res.data.items))
      } catch (e) {
        callback([])
      }
    },

    showContextMenu(e, node) {
      e.preventDefault()
      this.contextMenu = { visible: true, x: e.pageX, y: e.pageY, target: node }
      this.selectedPath = node.path
    },

    hideContextMenu() {
      this.contextMenu.visible = false
    },

    // ---- Context menu actions ----
    copyFilePath() {
      this.hideContextMenu()
      const path = this.contextMenu.target?.path
      if (path) {
        navigator.clipboard.writeText(path).catch(() => {})
      }
    },

    createNewPage() {
      this.hideContextMenu()
      this.newPageDialog = {
        visible: true,
        name: '',
        pageType: 'web',
        targetPath: this.contextMenu.target.path
      }
      this.$nextTick(() => this.$refs.newPageNameInput?.focus())
    },

    cancelNewPage() {
      this.newPageDialog.visible = false
    },

    async confirmNewPage() {
      const name = this.newPageDialog.name.trim()
      if (!name) return
      const filename = name + '_' + this.newPageDialog.pageType + '.html'
      const sep = this.newPageDialog.targetPath.includes('\\') ? '\\' : '/'
      const filePath = this.newPageDialog.targetPath + sep + filename
      const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 20px; }
  </style>
</head>
<body>
  <h1>${name}</h1>
</body>
</html>`
      try {
        await writeFile(filePath, template)
        this.newPageDialog.visible = false
        await this.refresh()
      } catch (e) {
        alert('创建网页失败: ' + e.message)
      }
    },

    createNewFolder() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      this.renameDialog = {
        visible: true,
        title: '新建文件夹',
        value: '',
        placeholder: '输入文件夹名',
        target,
        action: 'createFolder'
      }
      this.$nextTick(() => this.$refs.renameInput?.focus())
    },

    createRootFolder() {
      const target = { path: this.basePath, isDirectory: true }
      this.renameDialog = {
        visible: true,
        title: '新建文件夹',
        value: '',
        placeholder: '输入文件夹名',
        target,
        action: 'createFolder'
      }
      this.$nextTick(() => this.$refs.renameInput?.focus())
    },

    renameItem() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      this.renameDialog = {
        visible: true,
        title: target.isDirectory ? '重命名文件夹' : '重命名文件',
        value: target.name,
        placeholder: '输入新名称',
        target,
        action: 'rename'
      }
      this.$nextTick(() => {
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },

    cancelRename() {
      this.renameDialog.visible = false
    },

    async confirmRename() {
      const { value, target, action } = this.renameDialog
      if (!value.trim()) { this.renameDialog.visible = false; return }
      const sep = target.path.includes('\\') ? '\\' : '/'
      try {
        if (action === 'createFolder') {
          const newPath = target.path + sep + value.trim()
          await createDirectory(newPath)
        } else {
          const parentPath = target.path.substring(0, target.path.lastIndexOf(sep))
          const newPath = parentPath + sep + value.trim()
          await renameFile(target.path, newPath)
        }
        this.renameDialog.visible = false
        await this.refresh()
      } catch (e) {
        alert((action === 'createFolder' ? '创建文件夹' : '重命名') + '失败: ' + e.message)
      }
    },

    deleteItem() {
      this.hideContextMenu()
      this.deleteDialog = {
        visible: true,
        name: this.contextMenu.target.name,
        target: this.contextMenu.target
      }
    },

    cancelDelete() {
      this.deleteDialog.visible = false
    },

    async confirmDelete() {
      try {
        await deleteFile(this.deleteDialog.target.path)
        this.deleteDialog.visible = false
        if (this.selectedPath === this.deleteDialog.target.path) {
          this.selectedPath = ''
        }
        await this.refresh()
      } catch (e) {
        alert('删除失败: ' + e.message)
      }
    },

    async exportFolder() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      if (!target) return
      try {
        await exportFolder(target.path)
        alert('导出成功')
      } catch (e) {
        alert('导出失败: ' + e.message)
      }
    },

    previewFile() {
      const node = this.contextMenu.target
      this.hideContextMenu()
      this.handleOpenFile(node)
    },

    switchToAiDesign() {
      const node = this.contextMenu.target
      this.hideContextMenu()
      if (node && node.name.endsWith('.html')) {
        this.$emit('current-page', this.getRelativePath(node.path))
      }
      this.$emit('switch-to-ai-tab')
    },

    async downloadFile() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      if (!target) return
      try {
        const res = await getFileContent(target.path)
        const content = res.data?.content || ''
        const blob = new Blob([content], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = target.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        alert('下载失败: ' + e.message)
      }
    },

    onExpandPath(p) {
      const s = new Set(this.expandedPaths)
      s.add((p || '').replace(/\\/g, '/'))
      this.expandedPaths = s
    },

    onCollapsePath(p) {
      const s = new Set(this.expandedPaths)
      s.delete((p || '').replace(/\\/g, '/'))
      this.expandedPaths = s
    },

    selectByPath(relativePath) {
      if (!relativePath) return
      const normalizedRelative = relativePath.replace(/\\/g, '/')
      const parts = normalizedRelative.split('/')
      let parentPath = this.basePath.replace(/\\/g, '/')
      const newExpanded = new Set(this.expandedPaths)
      for (let i = 0; i < parts.length - 1; i++) {
        parentPath = parentPath + '/' + parts[i]
        newExpanded.add(parentPath)
      }
      this.expandedPaths = newExpanded
      this.selectedPath = this.basePath + '/' + normalizedRelative
    },

    onGlobalKeydown(e) {
      if (e.key === 'Escape') {
        this.hideContextMenu()
        this.cancelRename()
        this.cancelNewPage()
        this.cancelDelete()
      }
    }
  }
}
</script>

<style scoped>
.page-tree { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.tree-toolbar {
  display: flex; align-items: center; gap: 2px; padding: 4px 8px;
  border-bottom: 1px solid var(--border); flex-shrink: 0;
  background: var(--bg-titlebar);
}
.tree-toolbar-btn {
  padding: 3px 8px; background: transparent; border: none; border-radius: 4px;
  color: var(--text-muted); cursor: pointer; font-size: 12px; font-family: inherit;
}
.tree-toolbar-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.tree-body { flex: 1; overflow-y: auto; padding: 4px 0; }
.tree-loading { text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px; }
.tree-empty { text-align: center; padding: 40px 20px; color: var(--text-muted); }
.tree-empty-icon { font-size: 36px; margin-bottom: 8px; opacity: 0.3; }
.tree-empty-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

.context-menu {
  position: fixed; z-index: 100;
  background: var(--bg-side); border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 0; min-width: 150px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.context-menu-item {
  display: block; width: 100%; text-align: left; padding: 6px 14px;
  background: none; border: none; font-size: 12px; color: var(--text-primary);
  cursor: pointer; font-family: inherit;
}
.context-menu-item:hover { background: var(--bg-hover); }
.context-menu-item.danger { color: #f56c6c; }
.context-menu-sep { height: 1px; background: var(--border); margin: 4px 0; }

.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box {
  background: var(--bg-side); border: 1px solid var(--border);
  border-radius: 8px; padding: 20px; width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.dialog-sm { width: 320px; }
.dialog-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.dialog-field { margin-bottom: 10px; }
.dialog-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.dialog-input {
  width: 100%; padding: 7px 10px; font-size: 12px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); outline: none;
  font-family: inherit; box-sizing: border-box;
}
.dialog-input:focus { border-color: var(--accent); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.dialog-btn {
  padding: 6px 14px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-primary); cursor: pointer; font-family: inherit;
}
.dialog-btn:hover { background: var(--bg-hover); }
.dialog-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.dialog-btn.primary:hover { background: #4752c4; }
.dialog-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.dialog-btn.danger-btn { background: #f56c6c; color: #fff; border-color: #f56c6c; }
.dialog-btn.danger-btn:hover { background: #e05555; }
.dialog-msg { font-size: 13px; color: var(--text-primary); margin-bottom: 6px; }
.dialog-warn { font-size: 11px; color: var(--text-muted); }
.dialog-preview-filename { font-size: 11px; color: var(--text-muted); padding: 6px 8px; background: var(--bg-input); border-radius: 4px; margin-bottom: 8px; }

.device-types { display: flex; gap: 6px; }
.device-type {
  padding: 4px 12px; font-size: 11px; border-radius: 6px;
  cursor: pointer; border: 1px solid var(--border); color: var(--text-muted);
  transition: all 0.15s; display: flex; align-items: center; gap: 4px;
}
.device-type:hover { border-color: var(--text-muted); }
.device-type.active { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.device-type input { display: none; }
</style>
