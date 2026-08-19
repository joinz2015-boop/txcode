import Vue from 'vue'
import {
  getFileTree,
  getFileContent,
  writeFile,
  createDirectory,
  deleteFile,
  renameFile,
  browseFilesystem
} from '@/api/index'
import { getItem, setItem } from '@/utils/storage'
import { eventBus } from '@/utils/eventBus'

const STORAGE_KEY = 'file:state'

function sortNodes(nodes) {
  return (nodes || []).slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    const na = (a.name || '').toLowerCase()
    const nb = (b.name || '').toLowerCase()
    if (na < nb) return -1
    if (na > nb) return 1
    return 0
  })
}

function normalizeTree(nodes, parentPath) {
  return sortNodes(nodes).map(n => ({
    name: n.name,
    path: n.path,
    type: n.type === 'directory' ? 'dir' : 'file',
    children: n.type === 'directory' ? normalizeTree(n.children || [], n.path) : undefined,
    expanded: false,
    _empty: false
  }))
}

function nodeMatches(node, term) {
  if (!term) return true
  if ((node.name || '').toLowerCase().includes(term.toLowerCase())) return true
  if (node.children) return node.children.some(c => nodeMatches(c, term))
  return false
}

function collectVisible(node, term, out, level, editing) {
  if (!nodeMatches(node, term)) return
  out.push({ node, level })
  if (node.type === 'dir' && node.expanded && node.children) {
    node.children.forEach(c => collectVisible(c, term, out, level + 1, editing))
    if (editing && editing.mode !== 'rename' && editing.parent === node) {
      out.push({ placeholder: true, level: level + 1, parent: node })
    }
  }
}

function expandMatches(node, term) {
  if (!node.children) return
  const anyMatch = node.children.some(c => nodeMatches(c, term))
  if (anyMatch) node.expanded = true
  node.children.forEach(c => {
    if (c.children) {
      const childMatch = nodeMatches(c, term)
      if (childMatch) c.expanded = true
      expandMatches(c, term)
    }
  })
}

function findNode(root, path) {
  if (!root) return null
  if (root.path === path) return root
  if (!root.children) return null
  for (const c of root.children) {
    const r = findNode(c, path)
    if (r) return r
  }
  return null
}

function findParent(root, target) {
  if (!root || !root.children) return null
  for (const c of root.children) {
    if (c === target) return root
    const r = findParent(c, target)
    if (r) return r
  }
  return null
}

function updatePathRecursive(node, oldPath, newPath) {
  node.path = newPath + node.path.slice(oldPath.length)
  if (node.children) {
    node.children.forEach(c => updatePathRecursive(c, oldPath, newPath))
  }
}

function basename(p) {
  const parts = (p || '').split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

export function createFileManager() {
  const state = Vue.observable({
    root: null,
    selectedPath: '',
    tabs: [],
    activePath: '',
    searchTerm: '',
    editing: null,
    loading: false,
    sidebarWidth: getItem('file:sidebarWidth', 280)
  })

  const manager = {
    state,

    get visibleRows() {
      const rows = []
      if (state.root) {
        collectVisible(state.root, state.searchTerm, rows, 0, state.editing)
      }
      return rows
    },

    findNode(path) {
      return findNode(state.root, path)
    },

    findParent(node) {
      return findParent(state.root, node)
    },

    getVisibleRows() {
      return this.visibleRows
    },

    highlightMatch(name, term) {
      if (!term) return name
      const idx = name.toLowerCase().indexOf(term.toLowerCase())
      if (idx < 0) return name
      return (
        name.slice(0, idx) +
        '<span class="hl-match">' + name.slice(idx, idx + term.length) + '</span>' +
        name.slice(idx + term.length)
      )
    },

    nodeMatches(node, term) {
      return nodeMatches(node, term)
    },

    async loadTree(rootPath, projectName) {
      state.loading = true
      try {
        let base = rootPath || ''
        try {
          const browse = await browseFilesystem('')
          if (browse.data && browse.data.current_path) base = browse.data.current_path
        } catch (e) {}
        const res = await getFileTree(base || '')
        const children = normalizeTree(res.data || [], base)
        state.root = {
          name: projectName || basename(base) || 'txcode',
          path: base,
          type: 'dir',
          children,
          expanded: true,
          _empty: false
        }
        await this.restoreState()
      } finally {
        state.loading = false
      }
    },

    async refreshTree() {
      if (!state.root) return
      const base = state.root.path
      const res = await getFileTree(base || '')
      const children = normalizeTree(res.data || [], base)
      const expandedPaths = this.collectExpandedPaths()
      state.root = {
        name: state.root.name,
        path: base,
        type: 'dir',
        children,
        expanded: true,
        _empty: false
      }
      expandedPaths.forEach(p => {
        const n = findNode(state.root, p)
        if (n && n.type === 'dir') n.expanded = true
      })
      this.saveExpanded()
      this.emitToast('已刷新文件树', 'ok')
    },

    async toggleExpand(node) {
      if (!node || node.type !== 'dir') return
      if (!node.expanded && (!node.children || node.children.length === 0) && !node._empty) {
        try {
          const res = await getFileTree(node.path)
          const kids = normalizeTree(res.data || [], node.path)
          node.children = kids
          if (kids.length === 0) node._empty = true
        } catch (e) {
          node._empty = true
        }
      }
      node.expanded = !node.expanded
      this.saveExpanded()
    },

    selectNode(node) {
      state.selectedPath = node.path
      if (node.type === 'dir') {
        this.toggleExpand(node)
      } else {
        this.openFile(node.path)
      }
    },

    async openFile(path) {
      let tab = state.tabs.find(t => t.path === path)
      if (!tab) {
        try {
          const res = await getFileContent(path)
          const content = (res.data && res.data.content) || ''
          tab = {
            path,
            name: basename(path),
            content,
            savedContent: content,
            dirty: false
          }
          state.tabs.push(tab)
        } catch (e) {
          this.emitToast('打开文件失败: ' + (e.message || e), 'err')
          return
        }
      }
      state.activePath = path
      state.selectedPath = path
      this.saveTabs()
    },

    closeTab(path) {
      const idx = state.tabs.findIndex(t => t.path === path)
      if (idx < 0) return
      state.tabs.splice(idx, 1)
      if (state.activePath === path) {
        state.activePath = state.tabs.length ? state.tabs[state.tabs.length - 1].path : ''
      }
      this.saveTabs()
    },

    activateTab(path) {
      state.activePath = path
      state.selectedPath = path
      this.saveTabs()
    },

    async saveActive() {
      const tab = state.tabs.find(t => t.path === state.activePath)
      if (!tab) return
      try {
        await writeFile(tab.path, tab.content)
        tab.savedContent = tab.content
        tab.dirty = false
        this.emitToast('已保存: ' + tab.name, 'ok')
      } catch (e) {
        this.emitToast('保存失败: ' + (e.message || e), 'err')
      }
    },

    startCreate(mode, parent) {
      parent.expanded = true
      state.editing = { mode: mode === 'dir' ? 'dir' : 'file', parent, node: null }
    },

    startRename(node) {
      state.editing = { mode: 'rename', parent: null, node }
    },

    cancelEdit() {
      state.editing = null
    },

    async commitEdit(name) {
      const st = state.editing
      if (!st) return
      state.editing = null
      const trimmed = (name || '').trim()
      if (!trimmed) return

      if (st.mode === 'rename') {
        if (trimmed === st.node.name) return
        const oldPath = st.node.path
        const parent = this.findParent(st.node)
        if (!parent) return
        const newPath = parent && parent.path ? parent.path + '/' + trimmed : trimmed
        try {
          await renameFile(oldPath, newPath)
          st.node.name = trimmed
          updatePathRecursive(st.node, oldPath, newPath)
          state.tabs.forEach(t => {
            if (t.path === oldPath || t.path.startsWith(oldPath + '/') || t.path.startsWith(oldPath + '\\')) {
              t.path = newPath + t.path.slice(oldPath.length)
              t.name = basename(t.path)
            }
          })
          if (state.activePath === oldPath || state.activePath.startsWith(oldPath + '/')) {
            state.activePath = newPath + state.activePath.slice(oldPath.length)
          }
          if (state.selectedPath === oldPath) state.selectedPath = newPath
          this.saveTabs()
          this.emitToast('已重命名: ' + trimmed, 'ok')
        } catch (e) {
          this.emitToast('重命名失败: ' + (e.message || e), 'err')
        }
        return
      }

      const parent = st.parent
      const newPath = parent && parent.path ? parent.path + '/' + trimmed : trimmed
      try {
        if (st.mode === 'dir') {
          await createDirectory(newPath)
          const node = { name: trimmed, path: newPath, type: 'dir', children: [], expanded: false, _empty: false }
          if (!parent.children) parent.children = []
          parent.children.push(node)
          parent.children = sortNodes(parent.children)
          this.emitToast('已创建文件夹: ' + trimmed, 'ok')
        } else {
          await writeFile(newPath, '')
          const node = { name: trimmed, path: newPath, type: 'file', expanded: false, _empty: false }
          if (!parent.children) parent.children = []
          parent.children.push(node)
          parent.children = sortNodes(parent.children)
          this.emitToast('已创建文件: ' + trimmed, 'ok')
          this.openFile(newPath)
        }
      } catch (e) {
        this.emitToast('创建失败: ' + (e.message || e), 'err')
      }
    },

    async deleteNode(node) {
      if (node === state.root) return
      try {
        await deleteFile(node.path)
        const parent = this.findParent(node)
        if (parent && parent.children) {
          parent.children = parent.children.filter(c => c !== node)
        }
        const prefix = node.type === 'dir' ? node.path + '/' : node.path
        state.tabs = state.tabs.filter(t => {
          if (t.path === node.path || t.path.startsWith(prefix)) return false
          return true
        })
        if (state.activePath === node.path || state.activePath.startsWith(prefix)) {
          state.activePath = state.tabs.length ? state.tabs[state.tabs.length - 1].path : ''
        }
        this.saveTabs()
        this.emitToast('已删除: ' + node.name, 'ok')
      } catch (e) {
        this.emitToast('删除失败: ' + (e.message || e), 'err')
      }
    },

    collapseAll() {
      const stack = [state.root]
      while (stack.length) {
        const n = stack.pop()
        if (!n) continue
        if (n.children) {
          n.expanded = false
          stack.push(...n.children)
        }
      }
      if (state.root) state.root.expanded = true
      this.saveExpanded()
      this.emitToast('已折叠全部文件夹', 'ok')
    },

    collapseNode(node) {
      const stack = [...(node.children || [])]
      while (stack.length) {
        const n = stack.pop()
        if (n.children) {
          n.expanded = false
          stack.push(...n.children)
        }
      }
      this.saveExpanded()
    },

    setSearchTerm(term) {
      state.searchTerm = term
      if (term && state.root) {
        expandMatches(state.root, term)
      }
    },

    clearSearch() {
      state.searchTerm = ''
    },

    setSidebarWidth(w) {
      state.sidebarWidth = w
      setItem('file:sidebarWidth', w)
    },

    buildCopyLink(node) {
      const proto = location.protocol || 'https:'
      const host = location.host || 'localhost'
      const base = `${proto}//${host}${location.pathname.replace(/\/[^/]*$/, '/')}`
      const isDir = node.type === 'dir'
      return {
        url: `${base}?open=${encodeURIComponent(node.path)}${isDir ? '&dir=1' : ''}`,
        path: node.path,
        isDir
      }
    },

    collectExpandedPaths() {
      const arr = []
      const walk = n => {
        if (!n) return
        if (n.type === 'dir') {
          if (n.expanded && n.path) arr.push(n.path)
          if (n.children) n.children.forEach(walk)
        }
      }
      walk(state.root)
      return arr
    },

    saveExpanded() {
      const saved = getItem(STORAGE_KEY, {})
      saved.expanded = this.collectExpandedPaths()
      setItem(STORAGE_KEY, saved)
    },

    saveTabs() {
      const saved = getItem(STORAGE_KEY, {})
      saved.tabs = state.tabs.map(t => ({ path: t.path, name: t.name }))
      saved.active = state.activePath
      setItem(STORAGE_KEY, saved)
    },

    async restoreState() {
      const saved = getItem(STORAGE_KEY, {})
      if (saved.expanded && Array.isArray(saved.expanded)) {
        saved.expanded.forEach(p => {
          const n = findNode(state.root, p)
          if (n && n.type === 'dir') n.expanded = true
        })
      }
      if (saved.sidebarWidth) {
        state.sidebarWidth = saved.sidebarWidth
      }
      if (saved.tabs && Array.isArray(saved.tabs)) {
        const tabs = []
        for (const t of saved.tabs) {
          if (!t.path) continue
          try {
            const res = await getFileContent(t.path)
            const content = (res.data && res.data.content) || ''
            tabs.push({ path: t.path, name: t.name || basename(t.path), content, savedContent: content, dirty: false })
          } catch (e) {
            // 文件已不存在，跳过
          }
        }
        state.tabs = tabs
        const active = saved.active
        if (active && tabs.some(t => t.path === active)) {
          state.activePath = active
        } else if (tabs.length) {
          state.activePath = tabs[tabs.length - 1].path
        }
      }
    },

    emitToast(msg, type) {
      eventBus.emit('file:toast', { msg, type: type || 'ok' })
    }
  }

  return manager
}

export default createFileManager
