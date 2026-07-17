<template>
  <div class="design-view">
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <div class="panel-tabs">
        <div class="panel-tab" :class="{ active: designTab === 'pages' }" @click="setDesignTab('pages')">
          <span>📄</span> 设计页面
        </div>
        <div class="panel-tab" :class="{ active: designTab === 'ai' }" @click="setDesignTab('ai')">
          <span>🤖</span> AI设计助手
        </div>
      </div>

      <div class="tree-container" v-show="designTab === 'pages'">
        <div v-if="treeLoading" class="tree-loading">加载中...</div>
        <div v-else-if="treeNodes.length === 0" class="tree-empty">
          <div class="tree-empty-icon">📂</div>
          <p>设计目录为空</p>
          <p class="tree-empty-hint">右键文件夹创建网页</p>
        </div>
        <template v-else>
          <div v-for="node in treeNodes" :key="node.path">
            <div v-if="node.is_directory" class="tree-folder" :class="{ open: node.expanded }">
              <div class="tree-folder-header" @click="toggleTreeNode(node)" @contextmenu.prevent="showContextMenu($event, node)">
                <span class="tree-folder-arrow">▶</span>
                <span class="tree-folder-icon">📁</span>
                <span class="tree-folder-name">{{ node.name }}</span>
              </div>
              <div class="tree-folder-children" v-show="node.expanded">
                <div v-if="node.childrenLoading" class="tree-child-loading">...</div>
                <template v-else v-for="child in node.children">
                  <div v-if="child.is_directory" class="tree-folder child" :class="{ open: child.expanded }">
                    <div class="tree-folder-header" @click="toggleTreeNode(child)" @contextmenu.prevent="showContextMenu($event, child)">
                      <span class="tree-folder-arrow">▶</span>
                      <span class="tree-folder-icon">📁</span>
                      <span class="tree-folder-name">{{ child.name }}</span>
                    </div>
                    <div class="tree-folder-children" v-show="child.expanded">
                      <div v-if="child.childrenLoading" class="tree-child-loading">...</div>
                      <template v-else v-for="sub in child.children">
                        <div v-if="sub.is_directory" class="tree-folder child sub">
                          <div class="tree-folder-header" @click="toggleTreeNode(sub)" @contextmenu.prevent="showContextMenu($event, sub)">
                            <span class="tree-folder-arrow">▶</span>
                            <span class="tree-folder-icon">📁</span>
                            <span class="tree-folder-name">{{ sub.name }}</span>
                          </div>
                          <div class="tree-folder-children" v-show="sub.expanded">
                            <div v-if="sub.childrenLoading" class="tree-child-loading">...</div>
                            <div v-else v-for="item in sub.children" :key="item.path"
                              class="tree-file"
                              :class="{ active: selectedFilePath === item.path }"
                              @click="selectFileNode(item)"
                              @dblclick="openFileNode(item)"
                              @contextmenu.prevent="showContextMenu($event, item)">
                              <span class="tree-file-icon">📄</span>
                              <span class="tree-file-name">{{ item.name }}</span>
                            </div>
                          </div>
                        </div>
                        <div v-else :key="sub.path"
                          class="tree-file"
                          :class="{ active: selectedFilePath === sub.path }"
                          @click="selectFileNode(sub)"
                          @dblclick="openFileNode(sub)"
                          @contextmenu.prevent="showContextMenu($event, sub)">
                          <span class="tree-file-icon">📄</span>
                          <span class="tree-file-name">{{ sub.name }}</span>
                        </div>
                      </template>
                    </div>
                  </div>
                  <div v-else :key="child.path"
                    class="tree-file"
                    :class="{ active: selectedFilePath === child.path }"
                    @click="selectFileNode(child)"
                    @dblclick="openFileNode(child)"
                    @contextmenu.prevent="showContextMenu($event, child)">
                    <span class="tree-file-icon">📄</span>
                    <span class="tree-file-name">{{ child.name }}</span>
                  </div>
                </template>
              </div>
            </div>
            <div v-else :key="node.path"
              class="tree-file"
              :class="{ active: selectedFilePath === node.path }"
              @click="selectFileNode(node)"
              @dblclick="openFileNode(node)"
              @contextmenu.prevent="showContextMenu($event, node)">
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">{{ node.name }}</span>
            </div>
          </div>
        </template>
      </div>

      <div class="ai-chat-panel" v-show="designTab === 'ai'">
        <div class="chat-body" ref="designChatBody">
          <div v-if="logItems.length === 0 && !sessionId" class="chat-empty">
            <p>请在左侧选择设计页面后开始对话</p>
          </div>
          <div v-else-if="logItems.length === 0" class="chat-empty">
            <p>AI设计助手可协助您分析和优化设计</p>
            <p class="chat-empty-hint">Enter 发送，Ctrl+Enter 换行</p>
          </div>
          <div v-for="(item, idx) in logItems" :key="idx">
            <div v-if="item.type === 'chat'" class="chat-msg-wrap user">
              <div class="chat-msg-avatar user">👤</div>
              <div class="chat-msg-bubble user">{{ item.content }}</div>
            </div>
            <div v-else-if="item.type === 'think'" class="chat-msg-wrap ai">
              <div class="chat-msg-avatar ai">🤖</div>
              <div class="chat-msg-bubble ai" v-html="renderMarkdown(item.content)"></div>
            </div>
            <div v-else-if="item.type === 'system'" class="chat-system-msg" v-html="renderMarkdown(item.content)"></div>
            <div v-else-if="item.type === 'step'">
              <div v-if="item.thought" class="chat-msg-wrap ai">
                <div class="chat-msg-avatar ai">🤖</div>
                <div class="chat-msg-bubble ai" v-html="renderMarkdown(item.thought)"></div>
              </div>
              <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="tool-call-item">
                <template v-if="tc.status === 'executing'">
                  <span class="tool-spinner"></span>
                  {{ tc.function.name }}
                  <span v-if="tc.function.arguments" class="tool-args">{{ formatToolArgs(tc.function.name, tc.function.arguments) }}</span>
                </template>
                <template v-else>
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                    {{ item.success !== false ? '✓' : '✗' }}
                  </span>
                  {{ tc.function.name }}
                  <span v-if="tc.function.arguments" class="tool-args">{{ formatToolArgs(tc.function.name, tc.function.arguments) }}</span>
                </template>
              </div>
            </div>
          </div>
          <div v-if="thinking" class="chat-thinking">
            <span class="chat-spinner"></span> 思考中...
          </div>
        </div>
        <div class="chat-foot">
          <div class="chat-hints-row">
            <span class="chat-hint-chip" @click="sendDesignHint('调整当前页面配色方案')">调整配色方案</span>
            <span class="chat-hint-chip" @click="sendDesignHint('添加响应式布局')">响应式布局</span>
            <span class="chat-hint-chip" @click="sendDesignHint('优化按钮样式')">优化按钮</span>
            <span class="chat-hint-chip" @click="sendDesignHint('生成一个登录页面')">生成登录页</span>
          </div>
          <div class="chat-input-wrap">
            <textarea
              class="chat-textarea"
              v-model="designChatInput"
              placeholder="输入设计需求... (Enter 发送, Ctrl+Enter 换行)"
              :disabled="disabled && !stopping"
              @keydown="handleDesignKeydown"
            ></textarea>
            <button v-if="disabled && !stopping" class="chat-stop" @click="stopChat" title="停止">■</button>
            <button v-else-if="stopping" class="chat-stop" disabled>⏳</button>
            <button v-else class="chat-send" @click="sendDesignMessage" :disabled="!designChatInput.trim()" title="发送">▶</button>
          </div>
          <div class="chat-statusbar">
            <span :class="sessionStatus === 'processing' ? 'chat-status-thinking' : 'chat-status-ready'">
              <span v-if="sessionStatus === 'processing'" class="chat-spinner"></span>
              {{ sessionStatus === 'processing' ? ' 思考中' : '✓ 就绪' }}
            </span>
            <span class="sep">|</span>
            <span>模型：{{ modelName || 'Design Agent' }}</span>
            <span class="sep">|</span>
            <span>会话：{{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="resize-handle" @mousedown="startResize" :class="{ active: resizing }"></div>

    <div class="preview-panel">
      <div class="preview-toolbar">
        <span class="preview-toolbar-label">视口：</span>
        <button class="device-btn" :class="{ active: currentDevice === 'web' }" @click="setDevice('web')">🖥 Web</button>
        <button class="device-btn" :class="{ active: currentDevice === 'app' }" @click="setDevice('app')">📱 App</button>
        <button class="device-btn" :class="{ active: currentDevice === 'pad' }" @click="setDevice('pad')">🖥 Pad</button>
        <span class="preview-toolbar-spacer"></span>
        <button class="icon-btn" title="刷新预览" @click="refreshPreview">↻</button>
      </div>
      <div class="preview-body">
        <div class="preview-empty" v-if="!selectedFilePath || !isHtmlFile">
          <div class="preview-empty-icon">👁</div>
          <p class="preview-empty-text">双击左侧 HTML 文件预览</p>
        </div>
        <div class="device-frame" :class="currentDevice" v-else>
          <div class="device-frame-actions">
            <button class="device-action-btn" @click="refreshPreview">刷新</button>
          </div>
          <iframe class="preview-iframe" :srcdoc="fileContent" ref="previewIframe" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
      </div>
      <div class="preview-filebar">
        <span>{{ filebarPath }}</span>
      </div>
    </div>

    <div
      v-show="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <template v-if="contextMenu.target && contextMenu.target.is_directory">
        <button @click="createNewPage" class="context-menu-item">📄 新建网页</button>
        <button @click="createNewFolder" class="context-menu-item">📁 新建文件夹</button>
        <div class="context-menu-sep"></div>
        <button @click="renameItem" class="context-menu-item">✏ 重命名</button>
        <button @click="exportFolder" class="context-menu-item">📦 导出</button>
        <button @click="deleteItem" class="context-menu-item danger">🗑 删除</button>
      </template>
      <template v-else>
        <button @click="copyFilePath" class="context-menu-item">📋 复制路径</button>
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
import { getItem, setItem } from '@/utils/storage'
import { browseFilesystem, getFileContent, writeFile, createDirectory, deleteFile, renameFile, createSession, getSession, getMessages, getConfig, exportFolder } from '@/api/index'
import { ws } from '@/utils/websocket'

const DESIGN_BASE = '.txcode/design'

export default {
  name: 'DesktopDesignView',
  data() {
    return {
      designTab: getItem('design:tab', 'pages'),
      leftPanelWidth: getItem('design:leftPanelWidth', 280),
      currentDevice: getItem('design:device', 'web'),
      selectedFilePath: '',
      selectedFileName: '',
      fileContent: '',
      previewLoading: false,
      treeNodes: [],
      treeLoading: false,
      resizing: false,

      designChatInput: '',
      logItems: [],
      disabled: false,
      stopping: false,
      thinking: false,
      sessionId: '',
      sessionStatus: 'idle',
      modelName: '',
      currentPage: '',
      wsUnsubscribe: null,
      requestSeq: 0,

      contextMenu: { visible: false, x: 0, y: 0, target: null },
      renameDialog: { visible: false, title: '', value: '', placeholder: '', target: null, action: 'rename' },
      newPageDialog: { visible: false, name: '', pageType: 'web', targetPath: '' },
      deleteDialog: { visible: false, name: '', target: null }
    }
  },
  computed: {
    isHtmlFile() {
      return this.selectedFileName && this.selectedFileName.endsWith('.html')
    },
    filebarPath() {
      if (!this.selectedFilePath) return '未打开文件'
      return this.selectedFilePath
    },
    newPagePreviewName() {
      const n = this.newPageDialog.name.trim() || 'untitled'
      return n + '_' + this.newPageDialog.pageType + '.html'
    }
  },
  watch: {
    designTab(val) {
      setItem('design:tab', val)
      if (val === 'ai' && this.currentPage) {
        this.loadSessionForPage(this.currentPage)
      }
    },
    currentPage(val, oldVal) {
      if (val && val !== oldVal && this.designTab === 'ai') {
        this.loadSessionForPage(val)
      }
    }
  },
  async mounted() {
    await this.loadDefaultModel()
    await this.loadFileTree()
    document.addEventListener('click', this.hideContextMenu)
    document.addEventListener('keydown', this.onGlobalKeydown)
  },
  beforeDestroy() {
    if (this.wsUnsubscribe) this.wsUnsubscribe()
    document.removeEventListener('click', this.hideContextMenu)
    document.removeEventListener('keydown', this.onGlobalKeydown)
  },
  methods: {
    setDesignTab(tab) {
      this.designTab = tab
    },

    // ========== 文件树 ==========
    async loadFileTree() {
      this.treeLoading = true
      try {
        const res = await browseFilesystem(DESIGN_BASE)
        this.treeNodes = this.buildTreeNodes(res.data.items)
      } catch (e) {
        try {
          await createDirectory(DESIGN_BASE)
          const res = await browseFilesystem(DESIGN_BASE)
          this.treeNodes = this.buildTreeNodes(res.data.items)
        } catch (e2) {
          this.treeNodes = []
        }
      } finally {
        this.treeLoading = false
      }
    },

    buildTreeNodes(items) {
      return (items || [])
        .filter(item => item.name !== 'session.json' && item.name !== '.template')
        .map(item => ({
          name: item.name,
          path: item.path,
          is_directory: item.is_directory,
          expanded: false,
          children: [],
          childrenLoaded: false,
          childrenLoading: false
        }))
        .sort((a, b) => {
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        })
    },

    async toggleTreeNode(node) {
      if (!node.is_directory) return
      if (!node.childrenLoaded) {
        node.childrenLoading = true
        try {
          const res = await browseFilesystem(node.path)
          node.children = this.buildTreeNodes(res.data.items)
          node.childrenLoaded = true
        } catch (e) {
          node.children = []
        } finally {
          node.childrenLoading = false
        }
      }
      node.expanded = !node.expanded
    },

    selectFileNode(node) {
      this.selectedFilePath = node.path
      this.selectedFileName = node.name
      setItem('design:currentFile', node.path)
      if (!node.is_directory && node.name.endsWith('.html')) {
        this.currentPage = this.extractRelativePath(node.path)
      }
    },

    openFileNode(node) {
      this.selectFileNode(node)
      if (!node.is_directory && node.name.endsWith('.html')) {
        this.loadPreview()
      }
    },

    extractRelativePath(fullPath) {
      const normalized = fullPath.replace(/\\/g, '/')
      const prefix = DESIGN_BASE.replace(/\\/g, '/') + '/'
      const idx = normalized.indexOf(prefix)
      if (idx !== -1) {
        return normalized.slice(idx + prefix.length)
      }
      return ''
    },

    async refreshFileTree() {
      await this.loadFileTree()
      if (this.selectedFilePath) {
        this.previewLoading = true
        await this.loadPreview()
        this.previewLoading = false
      }
    },

    // ========== 预览 ==========
    async loadPreview() {
      if (!this.selectedFilePath || !this.isHtmlFile) return
      try {
        const res = await getFileContent(this.selectedFilePath)
        this.fileContent = res.data?.content || ''
      } catch (e) {
        this.fileContent = ''
      }
    },

    refreshPreview() {
      this.loadPreview()
    },

    setDevice(device) {
      this.currentDevice = device
      setItem('design:device', device)
    },

    // ========== 右键菜单 ==========
    showContextMenu(e, node) {
      this.contextMenu = { visible: true, x: e.pageX, y: e.pageY, target: node }
      this.selectedFilePath = node.path
      this.selectedFileName = node.name
    },

    hideContextMenu() {
      this.contextMenu.visible = false
    },

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
        await this.refreshFileTree()
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

    renameItem() {
      this.hideContextMenu()
      const target = this.contextMenu.target
      this.renameDialog = {
        visible: true,
        title: target.is_directory ? '重命名文件夹' : '重命名文件',
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
        await this.refreshFileTree()
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
        if (this.selectedFilePath === this.deleteDialog.target.path) {
          this.selectedFilePath = ''
          this.selectedFileName = ''
          this.fileContent = ''
        }
        await this.refreshFileTree()
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

    // ========== AI 设计助手 ==========
    async loadDefaultModel() {
      try {
        const res = await getConfig('defaultModel')
        this.modelName = res.data?.value || ''
      } catch (e) {}
    },

    getSessionJsonPath() {
      return DESIGN_BASE + '/session.json'
    },

    async readDesignSessionJson() {
      try {
        const res = await getFileContent(this.getSessionJsonPath())
        if (res && res.data?.content) {
          const data = JSON.parse(res.data.content)
          return data
        }
      } catch (e) {}
      return { pageSessions: {} }
    },

    async writeDesignSessionJson(data) {
      await writeFile(this.getSessionJsonPath(), JSON.stringify(data, null, 2))
    },

    async loadSessionForPage(pagePath) {
      const seq = ++this.requestSeq
      if (!pagePath || !pagePath.endsWith('.html')) {
        if (this.wsUnsubscribe) { this.wsUnsubscribe(); this.wsUnsubscribe = null }
        this.sessionId = ''
        this.logItems = []
        this.sessionStatus = 'idle'
        this.thinking = false
        return
      }

      const sessionData = await this.readDesignSessionJson()
      if (this.requestSeq !== seq) return
      const pageSession = sessionData.pageSessions?.[pagePath]

      if (pageSession?.sessionId) {
        try {
          const sessionRes = await getSession(pageSession.sessionId)
          if (this.requestSeq !== seq) return
          if (sessionRes && sessionRes.data) {
            this.sessionId = pageSession.sessionId
            this.subscribeSession()
            await this.loadMessages()
            return
          }
        } catch (e) {}
      }

      try {
        const res = await createSession('设计页面: ' + pagePath)
        if (this.requestSeq !== seq) return
        this.sessionId = res.data.id
        sessionData.pageSessions[pagePath] = { sessionId: this.sessionId }
        await this.writeDesignSessionJson(sessionData)
        if (this.requestSeq !== seq) return
        this.logItems = []
        this.subscribeSession()
      } catch (e) {
        console.error('Create session failed:', e)
      }
    },

    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await getMessages(this.sessionId)
        const VALID_TYPES = ['chat', 'system', 'step', 'think']
        const rawItems = res.data || []
        this.logItems = rawItems.filter(item => item && VALID_TYPES.includes(item.type))
        this.$nextTick(() => this.scrollChatToBottom())
      } catch (e) {
        this.logItems = []
      }
    },

    subscribeSession() {
      if (!this.sessionId) return
      if (this.wsUnsubscribe) this.wsUnsubscribe()

      this.wsUnsubscribe = ws.subscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
          this.thinking = isRunning
        },
        step: (data) => {
          const hasExecuting = data.toolCalls?.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this.logItems = this.logItems.filter(
              item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
            )
            this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration, _executing: true })
          } else {
            this.logItems = this.logItems.filter(
              item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
            )
            this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration })
          }
          this.thinking = true
          this.$nextTick(() => this.scrollChatToBottom())
        },
        done: (data) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.disabled = false
          this.stopping = false
          this.thinking = false
          this.sessionStatus = 'completed'
          if (data?.modelName) this.modelName = data.modelName
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.$nextTick(() => this.scrollChatToBottom())
          this.$emit('design-updated')
        },
        stopped: () => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.disabled = false
          this.stopping = false
          this.thinking = false
          this.sessionStatus = 'idle'
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollChatToBottom())
        },
        error: (data) => {
          this.logItems = this.logItems.filter(item => !(item.type === 'step' && item._executing))
          alert(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.thinking = false
          this.sessionStatus = 'idle'
        },
        compact: () => {
          this.logItems.push({ type: 'system', content: '【会话已压缩】' })
          this.loadMessages()
        }
      })
    },

    handleDesignKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const textarea = e.target
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          this.designChatInput = this.designChatInput.substring(0, start) + '\n' + this.designChatInput.substring(end)
          this.$nextTick(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1
          })
        } else {
          e.preventDefault()
          this.sendDesignMessage()
        }
      }
    },

    async sendDesignMessage() {
      const content = this.designChatInput.trim()
      if (!content || this.disabled) return

      if (!this.currentPage || !this.currentPage.endsWith('.html')) {
        alert('请先在左侧选择设计页面')
        return
      }

      if (!this.sessionId) {
        await this.loadSessionForPage(this.currentPage)
        if (!this.sessionId) return
      }

      if (!this.wsUnsubscribe) this.subscribeSession()

      const contextMsg = `当前设计页面：${this.currentPage}\n用户需求：${content}\n请基于以上设计页面路径，对该页面进行设计或修改。`

      this.logItems.push({ type: 'chat', content })
      this.designChatInput = ''
      this.disabled = true
      this.stopping = false
      this.thinking = true
      this.sessionStatus = 'processing'

      ws.send('chat', {
        message: contextMsg,
        sessionId: this.sessionId,
        modelName: this.modelName || undefined,
        agent: 'design'
      })
      this.$nextTick(() => this.scrollChatToBottom())
    },

    sendDesignHint(msg) {
      this.designChatInput = msg
      this.sendDesignMessage()
    },

    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.sessionId })
    },

    scrollChatToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.designChatBody
        if (el) el.scrollTop = el.scrollHeight
      })
    },

    onGlobalKeydown(e) {
      if (e.key === 'Escape') {
        this.hideContextMenu()
        this.cancelRename()
        this.cancelNewPage()
        this.cancelDelete()
      }
    },

    // ========== 渲染辅助 ==========
    renderMarkdown(content) {
      if (!content) return ''
      let html = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      html = html.replace(/\n/g, '<br>')
      return html
    },

    formatToolArgs(name, args) {
      try {
        const parsed = typeof args === 'string' ? JSON.parse(args) : args
        if (name === 'bash' || name === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ' (' + parsed.workdir + ')' : '')
        }
        if (name === 'read_file') {
          return parsed.file_path + (parsed.offset ? ':' + parsed.offset : '')
        }
        if (name === 'edit_file' || name === 'write_file') {
          return parsed.file_path || parsed.path || ''
        }
        if (name === 'glob' || name === 'find_files') {
          return parsed.pattern + (parsed.directory ? ' (' + parsed.directory + ')' : '')
        }
        if (name === 'grep' || name === 'search_content') {
          return '"' + parsed.pattern + '"' + (parsed.directory ? ' (' + parsed.directory + ')' : '')
        }
        return JSON.stringify(parsed)
      } catch { return args }
    },

    // ========== 面板拖拽 ==========
    startResize(e) {
      this.resizing = true
      const startX = e.clientX
      const startW = this.leftPanelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        const w = Math.max(220, Math.min(500, startW + (ev.clientX - startX)))
        this.leftPanelWidth = w
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setItem('design:leftPanelWidth', this.leftPanelWidth)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    }
  }
}
</script>

<style scoped>
.design-view { flex: 1; display: flex; overflow: hidden; }
.left-panel {
  width: 280px; min-width: 220px; max-width: 500px;
  background: var(--bg-side); display: flex; flex-direction: column;
  border-right: 1px solid var(--border); overflow: hidden;
}
.panel-tabs { display: flex; border-bottom: 1px solid var(--border); background: var(--bg-titlebar); flex-shrink: 0; }
.panel-tab {
  flex: 1; text-align: center; padding: 10px 8px; cursor: pointer;
  font-size: 12.5px; border-bottom: 2px solid transparent;
  transition: all 0.15s; color: var(--text-muted); user-select: none;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.panel-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.panel-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

.tree-container { flex: 1; overflow-y: auto; padding: 6px 0; }
.tree-loading { text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px; }
.tree-empty { text-align: center; padding: 40px 20px; color: var(--text-muted); }
.tree-empty-icon { font-size: 36px; margin-bottom: 8px; opacity: 0.3; }
.tree-empty-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.tree-child-loading { padding: 4px 38px; font-size: 11px; color: var(--text-muted); }

.tree-folder-header {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  cursor: pointer; font-size: 12.5px; color: var(--text-secondary);
  transition: background 0.1s; user-select: none;
}
.tree-folder-header:hover { background: var(--bg-hover); }
.tree-folder-arrow { width: 14px; font-size: 10px; color: var(--text-muted); transition: transform 0.15s; flex-shrink: 0; }
.tree-folder.open > .tree-folder-header > .tree-folder-arrow { transform: rotate(90deg); }
.tree-folder-icon { font-size: 13px; flex-shrink: 0; color: var(--yellow); }
.tree-folder-name { font-weight: 500; }
.tree-folder-children { display: none; }
.tree-folder.open > .tree-folder-children { display: block; }

.tree-folder.child > .tree-folder-header { padding-left: 30px; }
.tree-folder.child.sub > .tree-folder-header { padding-left: 46px; }
.tree-folder.child > .tree-folder-children > .tree-file { padding-left: 54px; }
.tree-folder.child.sub > .tree-folder-children > .tree-file { padding-left: 70px; }
.tree-folder.child > .tree-folder-children > .tree-folder.child > .tree-folder-header { padding-left: 46px; }
.tree-folder.child > .tree-folder-children > .tree-folder.child.sub > .tree-folder-header { padding-left: 62px; }

.tree-file {
  display: flex; align-items: center; gap: 6px; padding: 5px 14px 5px 38px;
  cursor: pointer; font-size: 12px; color: var(--text-secondary);
  transition: all 0.1s; user-select: none; border-left: 2px solid transparent;
}
.tree-file:hover { background: var(--bg-hover); color: var(--text-primary); }
.tree-file.active { background: var(--accent-light); color: var(--accent); border-left-color: var(--accent); font-weight: 500; }
.tree-file-icon { font-size: 12px; flex-shrink: 0; color: var(--accent); }
.tree-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ai-chat-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.chat-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.chat-empty { text-align: center; color: var(--text-muted); padding: 30px 10px; font-size: 13px; }
.chat-empty-hint { font-size: 11px; margin-top: 4px; }

.chat-msg-wrap { display: flex; gap: 6px; max-width: 100%; }
.chat-msg-wrap.user { justify-content: flex-end; }
.chat-msg-avatar { width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.chat-msg-avatar.ai { background: var(--accent-light); color: var(--accent); }
.chat-msg-avatar.user { background: #e5e5ea; color: #6e6e73; }
.chat-msg-bubble { padding: 7px 11px; border-radius: 8px; font-size: 12px; line-height: 1.55; max-width: 85%; }
.chat-msg-bubble.ai { background: #fff; color: var(--text-primary); border: 1px solid var(--border); border-top-left-radius: 2px; }
.chat-msg-bubble.user { background: var(--accent); color: #fff; border-top-right-radius: 2px; }
.chat-msg-bubble code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10.5px; color: #e74c3c; }
.chat-msg-bubble pre { background: rgba(0,0,0,0.04); padding: 6px 8px; border-radius: 4px; overflow-x: auto; font-size: 10.5px; margin: 4px 0; }

.chat-system-msg { font-size: 11px; color: var(--text-muted); text-align: center; padding: 4px 0; }

.tool-call-item { font-size: 11px; color: var(--text-muted); padding: 3px 6px; margin-left: 32px; }
.tool-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 4px; vertical-align: middle; }
.tool-success { color: var(--green); }
.tool-fail { color: #f56c6c; }
.tool-args { color: var(--accent); margin-left: 4px; font-size: 10px; }

.chat-thinking { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--accent); padding: 4px 0; }

.chat-foot { border-top: 1px solid var(--border); flex-shrink: 0; }
.chat-input-wrap { display: flex; gap: 6px; padding: 8px 10px; }
.chat-textarea { flex: 1; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px; font-size: 12px; color: var(--text-primary); outline: none; resize: none; font-family: inherit; height: 34px; line-height: 1.4; }
.chat-textarea:focus { border-color: var(--accent); }
.chat-textarea:disabled { opacity: 0.5; }
.chat-hints-row { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 10px 8px; }
.chat-hint-chip { font-size: 10px; padding: 2px 8px; border-radius: 10px; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.15s; }
.chat-hint-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.chat-send { width: 34px; height: 34px; border-radius: 8px; border: none; background: var(--accent); color: #fff; cursor: pointer; font-size: 14px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chat-send:hover { background: #4752c4; }
.chat-send:disabled { background: #c5c5d0; cursor: not-allowed; }
.chat-stop { width: 34px; height: 34px; border-radius: 8px; border: none; background: #f56c6c; color: #fff; cursor: pointer; font-size: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.chat-stop:hover { background: #e05555; }
.chat-stop:disabled { opacity: 0.5; cursor: not-allowed; }
.chat-statusbar { display: flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 10.5px; color: var(--text-muted); border-top: 1px solid var(--border); flex-shrink: 0; background: var(--bg-titlebar); }
.chat-status-ready { color: var(--green); }
.chat-status-thinking { color: var(--accent); }
.chat-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.sep { color: var(--border); }

.resize-handle { width: 3px; min-width: 3px; background: var(--border); cursor: col-resize; transition: background 0.15s; flex-shrink: 0; }
.resize-handle:hover, .resize-handle.active { background: var(--accent); }

.preview-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-panel); min-width: 300px; }
.preview-toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-bottom: 1px solid var(--border); background: var(--bg-side); flex-shrink: 0; }
.preview-toolbar-label { font-size: 11px; color: var(--text-muted); }
.preview-toolbar-spacer { flex: 1; }
.device-btn { padding: 4px 12px; font-size: 11px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; background: transparent; color: var(--text-muted); transition: all 0.15s; }
.device-btn:hover { border-color: var(--border); color: var(--text-primary); }
.device-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.icon-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.preview-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 16px; background: #fafafa; background-image: radial-gradient(circle, #e5e5ea 1px, transparent 1px); background-size: 20px 20px; }
.preview-empty { text-align: center; color: var(--text-muted); }
.preview-empty-icon { font-size: 56px; margin-bottom: 12px; opacity: 0.3; }
.preview-empty-text { font-size: 13px; }
.device-frame { display: flex; flex-direction: column; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); background: #fff; transition: all 0.2s; }
.device-frame.web { width: 100%; height: 100%; max-width: 100%; }
.device-frame.app { width: 375px; height: 100%; max-height: 760px; }
.device-frame.pad { width: 768px; height: 100%; max-height: 95%; }
.device-frame-actions { display: flex; justify-content: flex-end; gap: 2px; padding: 4px 6px; background: #f5f5f7; border-bottom: 1px solid #e5e5ea; }
.device-action-btn { padding: 3px 8px; font-size: 11px; border: none; border-radius: 4px; background: transparent; color: #8e8e93; cursor: pointer; transition: all 0.15s; }
.device-action-btn:hover { background: #e5e5ea; color: #1d1d1f; }
.preview-iframe { width: 100%; flex: 1; border: none; display: block; }
.preview-filebar { height: 26px; background: var(--bg-titlebar); border-top: 1px solid var(--border); display: flex; align-items: center; padding: 0 12px; font-size: 11px; color: var(--text-muted); flex-shrink: 0; }

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
