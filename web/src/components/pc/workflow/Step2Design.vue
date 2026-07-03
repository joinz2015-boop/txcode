<template>
  <div class="step2-container">
    <div class="step2-main">
      <div class="editor-panel">
        <div class="editor-header">
          <span class="editor-title">
            <i class="el-icon-document"></i>
            <span>{{ specFilePath }}</span>
          </span>
          <div class="editor-actions">
            <el-button size="small" type="text" @click="saveSpec" title="保存方案"><i class="el-icon-check"></i></el-button>
            <el-button size="small" type="text" @click="refreshSpec" title="刷新方案"><i class="el-icon-refresh"></i></el-button>
            <el-button size="small" type="text" @click="exportScheme" title="导出方案"><i class="el-icon-download"></i></el-button>
            <el-button size="small" type="text" @click="$emit('create-sub-scheme')" title="新建子方案"><i class="el-icon-plus"></i></el-button>
          </div>
        </div>
        <div class="editor-container" ref="editorContainer"></div>
      </div>
      <div class="resize-handle" @mousedown="startResize"></div>
      <div class="chat-panel" ref="chatPanel" :style="{ width: chatPanelWidth + 'px' }">
        <div class="panel-header panel-tabs">
          <div
            class="panel-tab"
            :class="{ active: chatTab === 'assistant' }"
            @click="chatTab = 'assistant'"
          >
            <i class="el-icon-chat-dot-round"></i> AI生成方案
          </div>
          <div
            class="panel-tab"
            :class="{ active: chatTab === 'discuss' }"
            @click="chatTab = 'discuss'"
          >
            <i class="el-icon-chat-dot-square"></i> AI方案交流
          </div>
        </div>
        <template v-if="chatTab === 'assistant'">
          <div class="chat-messages" ref="messagesContainer">
            <div v-if="!logItems.length" class="empty-state">
              <i class="el-icon-chat-dot-round"></i>
              <p>输入需求描述，AI将协助您完善方案</p>
            </div>
            <template v-for="(item, idx) in logItems" :key="idx">
              <div v-if="item.type === 'todos'" class="todos-list">
                <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
                  <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                  <span class="todo-name">{{ todo.name }}</span>
                </div>
              </div>
              <div v-if="item.type === 'chat'" class="flex justify-end">
                <div class="user-question">
                  <div v-if="item.mediaFiles && item.mediaFiles.length > 0" class="chat-images">
                    <img
                      v-for="mf in item.mediaFiles"
                      :key="mf.filePath"
                      :src="mf.url || mf.dataUrl || mf.filePath"
                      class="chat-image-thumb"
                      @click.stop="openImagePreview(mf)"
                    />
                  </div>
                  <div>{{ item.content }}</div>
                </div>
              </div>
              <div v-else-if="item.type === 'system'" class="system-message" v-html="renderMarkdown(item.content)"></div>
              <template v-else-if="item.type === 'step'">
                <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
                <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">
                    {{ item.success !== false ? '✓' : '✗' }}
                  </span>
                  {{ tc.function.name }}
                  <span v-if="tc.function.arguments" class="tool-input">{{ formatInput(tc.function.name, tc.function.arguments) }}</span>
                </div>
              </template>
              <div v-else-if="item.type === 'think'" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
            </template>
            <div class="build-info" v-if="modelName">
              <span class="icon">▣</span> Build · {{ modelName }}
            </div>
          </div>
          <div class="chat-input-area">
            <ImagePreviewList
              v-if="mediaFiles && mediaFiles.length > 0"
              :files="mediaFiles"
              :disabled="disabled"
              @remove="removeMedia"
            />
            <div class="input-panel">
              <div class="input-wrapper">
                <ResizableTextarea
                  v-model="inputMessage"
                  :rows="5"
                  placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
                  :disabled="disabled && !stopping"
                  class="input-area"
                  @keydown.enter.native="handleKeydown"
                  @paste-image="handlePasteImages"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref="mediaInput"
                  style="display:none"
                  @change="handleImageSelected"
                />
              </div>
              <div class="input-actions">
                <div class="input-actions-left">
                  <span class="status-action" @click="openFileSelect" @mousedown.prevent>选择文件</span>
                  <span class="separator">|</span>
                  <span class="status-action" @click="openSkillSelect" @mousedown.prevent>选择Skill</span>
                  <span class="separator">|</span>
                  <span class="status-action" @click="openDesignSelect" @mousedown.prevent>选择设计</span>
                  <span class="separator">|</span>
                  <span class="status-action" @click="openCommandDialog" @mousedown.prevent>命令</span>
                </div>
                <div class="input-actions-right">
                  <el-button @click="handleImageUpload" :disabled="disabled" class="upload-btn" size="small">图片</el-button>
                <el-button
                  v-for="action in customActions"
                  :key="action.id"
                  type="info"
                  size="small"
                  @click="executeCustomAction(action)"
                  :disabled="disabled"
                >
                  {{ action.name }}
                </el-button>
                <el-button v-if="disabled && !stopping" type="danger" @click="stopChat" class="stop-btn" size="small">
                  ■ 停止
                </el-button>
                <el-button v-else-if="stopping" type="info" disabled class="stop-btn" size="small">
                  停止中...
                </el-button>
                <el-button v-else type="primary" :disabled="!inputMessage.trim() && mediaFiles.length === 0" @click="sendMessage" class="send-btn" size="small">
                  发送
                </el-button>
              </div>
            </div>
          </div>
          <div class="status-bar">
            <span :class="sessionStatus === 'processing' ? 'status-thinking' : 'status-ready'">
              <span v-if="sessionStatus === 'processing'" class="thinking-spinner"></span>
              {{ sessionStatus === 'processing' ? '思考中' : '✓ 就绪' }}
            </span>
            <span class="separator">|</span>
            <span class="model-selector" @click="openModelSelector" @mousedown.prevent>
              模型：{{ modelName || '-' }} ▾
            </span>
            <span class="separator">|</span>
            <span>会话：{{ sessionId ? sessionId.slice(0, 8) : '--------' }}</span>
            <span class="separator">|</span>
            <span>token：{{ promptTokens || 0 }}</span>
          </div>
        </template>
        <DesignDiscuss
          v-if="chatTab === 'discuss'"
          :category="category"
          :name="name"
          :reqBasePath="reqBasePath"
        />
      </div>
    </div>

    <ModelSelectDialog
      :visible.sync="modelSelectVisible"
      :current-model="modelName"
      @select="onModelSelected"
    />

    <CommandDialog
      :visible.sync="commandDialogVisible"
      @execute="handleExecuteCommand"
    />

    <FileSelectDialog
      :visible.sync="fileSelectVisible"
      @select="onFileSelected"
      @close="cancelFileSelect"
    />

    <SkillSelectDialog
      :visible.sync="skillSelectVisible"
      @select="onSkillSelected"
      @close="cancelSkillSelect"
    />

    <DesignSelectDialog
      :visible.sync="designSelectVisible"
      @select="onDesignSelected"
      @close="designSelectVisible = false"
    />

    <div v-if="previewImage" class="image-lightbox" @click="closeImagePreview">
      <span class="lightbox-close" @click="closeImagePreview">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import { api } from '../../../api/index.js'
import { marked } from 'marked'
import * as monaco from 'monaco-editor'
import ModelSelectDialog from '../model/ModelSelectDialog.vue'
import CommandDialog from '../common/CommandDialog.vue'
import FileSelectDialog from '../file/FileSelectDialog.vue'
import SkillSelectDialog from '../skill/SkillSelectDialog.vue'
import DesignSelectDialog from '../design/DesignSelectDialog.vue'
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import ImagePreviewList from '../chat/ImagePreviewList.vue'
import DesignDiscuss from './DesignDiscuss.vue'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'
import { mediaChatMixin } from '../../../lib/mediaChat.js'

export default {
  name: 'Step2Design',
  components: { ModelSelectDialog, CommandDialog, FileSelectDialog, SkillSelectDialog, DesignSelectDialog, ResizableTextarea, ImagePreviewList, DesignDiscuss },
  mixins: [mediaChatMixin()],
  props: {
    category: { type: String, default: '' },
    name: { type: String, default: '' },
    reqBasePath: { type: String, default: '' }
  },
  data() {
    return {
      editor: null,
      specContent: '',
      inputMessage: '',
      disabled: false,
      stopping: false,
      promptTokens: 0,
      logItems: [],
      modelName: '',
      modelSelectVisible: false,
      commandDialogVisible: false,
      fileSelectVisible: false,
      skillSelectVisible: false,
      designSelectVisible: false,
      skillCursorPos: -1,
      sessionId: '',
      sessionStatus: 'idle',
      customActions: [],
      chatTab: 'assistant',
      parentInfo: null,
      chatPanelWidth: 480,
      isResizing: false,
      startX: 0,
      startWidth: 0,
      minChatWidth: 320,
      maxChatWidthRatio: 0.6
    }
  },
  computed: {
    specFilePath() {
      if (!this.category || !this.name) return '等待选择需求...'
      return `${this.reqBasePath}/${this.category}/${this.name}/${this.name}_方案.md`
    }
  },
  watch: {
    category: { handler() { this.loadData() } },
    name: { handler() { this.loadData() } },
    reqBasePath: {
      handler(newVal) {
        if (newVal) {
          this.loadData()
        }
      }
    }
  },
  async mounted() {
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
    this.initMonacoEditor()
    await this.loadData()
    await this.loadDefaultModel()
    await this.loadCustomActions()
    api.ws.init()
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe()
    }
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const textarea = e.target
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const value = this.inputMessage
          this.inputMessage = value.substring(0, start) + '\n' + value.substring(end)
          this.$nextTick(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1
          })
        } else {
          e.preventDefault()
          this.sendMessage()
        }
      }
    },
    async loadData() {
      if (!this.reqBasePath) return
      await Promise.all([this.loadSpec(), this.loadSession()])
    },
    async loadSpec() {
      if (!this.category || !this.name) {
        this.specContent = '# 选择或创建需求项目开始设计\n'
        this.syncEditorContent(this.specContent)
        return
      }
      try {
        const specPath = this.specFilePath
        const res = await api.getFileContent(specPath)
        this.specContent = res.data?.content || ''
        this.syncEditorContent(this.specContent)
      } catch (e) {
        console.error('Load spec failed:', e)
        this.specContent = ''
        this.syncEditorContent('')
      }
    },
    async loadSession() {
      if (!this.category || !this.name) {
        this.sessionId = ''
        this.$emit('update:sessionId', '')
        this.parentInfo = null
        return
      }
      try {
        const sessionFilePath = `${this.reqBasePath}/${this.category}/${this.name}/session.json`
        const fileRes = await api.getFileContent(sessionFilePath)
        if (fileRes && fileRes.data?.content) {
          const sessionData = JSON.parse(fileRes.data.content)
          this.sessionId = sessionData.designSessionId || ''
          this.parentInfo = sessionData.parent || null
        } else {
          this.sessionId = ''
          this.parentInfo = null
        }
        this.$emit('update:sessionId', this.sessionId)
        if (this.sessionId) {
          await this.loadMessages()
          this.subscribeSession()
        } else {
          this.logItems = []
        }
      } catch (e) {
        console.error('Load session failed:', e)
        this.sessionId = ''
        this.$emit('update:sessionId', '')
        this.parentInfo = null
        this.logItems = []
      }
    },
    syncEditorContent(content) {
      if (!this.editor || content === undefined || content === null) return
      const next = String(content)
      if (this.editor.getValue() !== next) {
        this.editor.setValue(next)
      }
    },
    initMonacoEditor() {
      if (this.editor) return
      this.$nextTick(() => {
        this.createEditor()
      })
    },
    createEditor() {
      if (this.editor) return
      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        value: this.specContent || '# 选择或创建需求项目开始设计\n',
        language: 'markdown',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16 },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false
        }
      })
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveSpec()
      })
      this.syncEditorContent(this.specContent)
    },
    saveSpec() {
      if (!this.editor) return
      const content = this.editor.getValue()
      this.$emit('save-spec', content)
    },
    async refreshSpec() {
      await this.loadSpec()
      this.$message.success('方案已刷新')
    },
    exportScheme() {
      if (!this.category || !this.name) {
        this.$message.warning('请先选择方案')
        return
      }
      const fileName = `${this.name}_方案.md`
      api.downloadFilesystemWithProgress(this.specFilePath, fileName)
    },
    async sendMessage() {
      const content = this.inputMessage.trim()
      const hasMedia = this.mediaFiles && this.mediaFiles.length > 0
      if ((!content && !hasMedia) || this.disabled) return

      if (!this.sessionId) {
        this.$message.error('会话不存在，请刷新页面')
        return
      }

      if (!this.wsUnsubscribe) {
        this.subscribeSession()
      }

      let extraContext = ''
      if (this.logItems.length === 0 && this.parentInfo) {
        extraContext = `\n\n注意：当前方案是「${this.parentInfo.name}」的子方案，请参考父方案内容。父方案路径：${this.parentInfo.specPath}`
      }

      const contextMsg = `${extraContext ? extraContext + '\n\n' : ''}用户输入: ${content}`

      this.inputMessage = ''
      this.disabled = true
      this.stopping = false
      const sentMediaFiles = (this.mediaFiles || [])
        .filter(f => !f.uploading && f.filePath)
        .map(f => ({ filePath: f.filePath, type: f.type, dataUrl: f.dataUrl }))
      this.logItems.push({ type: 'chat', content: content, mediaFiles: sentMediaFiles })
      this.scrollChatToBottom(true)

      api.sessionWsSend(this.sessionId, 'chat', {
        message: contextMsg,
        sessionId: this.sessionId,
        modelName: this.modelName || undefined,
        agent: 'plan',
        planFilePath: this.specFilePath,
        mediaFiles: sentMediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
      })
      this.mediaFiles = []
    },
    stopChat() {
      if (!this.sessionId || this.stopping) return
      this.stopping = true
      api.sessionWsSend(this.sessionId, 'stop', { sessionId: this.sessionId })
    },
    subscribeSession() {
      if (!this.sessionId) return
      
      if (this.wsUnsubscribe) {
        this.wsUnsubscribe()
      }

      this.wsUnsubscribe = api.wsSubscribe(this.sessionId, {
        running_sessions: (data) => {
          const runningIds = data?.runningSessionIds || []
          const isRunning = runningIds.includes(this.sessionId)
          this.sessionStatus = isRunning ? 'processing' : 'idle'
          this.disabled = isRunning
        },
        todos: (data) => {
          console.log('[Step2Design] WS todos event, todos count:', data?.todos?.length)
          if (data?.todos) this.logItems.push({ type: 'todos', todos: data.todos })
          this.scrollChatToBottom()
        },
        step: (data) => {
          console.log('[Step2Design] WS step event, has thought:', !!data.thought, 'toolCalls:', data?.toolCalls?.length)
          this.logItems.push({ type: 'step', thought: data.thought, toolCalls: data.toolCalls, success: data.success })
          if (data.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          this.scrollChatToBottom()
        },
        compact: (data) => {
          this.logItems.push({ type: 'system', content: `【压缩完成】${data.summary || ''}` })
          this.loadMessages()
        },
        done: (data) => {
          console.log('[Step2Design] WS done event')
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'completed'
          if (data?.modelName) this.modelName = data.modelName
          if (data?.usage?.promptTokens) this.promptTokens = data.usage.promptTokens
          if (data?.response) this.logItems.push({ type: 'think', content: data.response })
          this.$emit('spec-updated')
          this.scrollChatToBottom()
        },
        stopped: () => {
          console.log('[Step2Design] WS stopped event')
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
          this.logItems.push({ type: 'think', content: '【已停止】' })
          this.scrollChatToBottom()
        },
        error: (data) => {
          this.$message.error(data?.error || '发生错误')
          this.disabled = false
          this.stopping = false
          this.sessionStatus = 'idle'
        }
      })
    },
    scrollChatToBottom(force = false) {
      const snap = snapshotScroll(this.$refs.messagesContainer)
      console.log('[Step2Design] scrollChatToBottom called, force:', force, 'snap:', JSON.stringify(snap))
      this.$nextTick(() => {
        scrollToBottom(this.$refs.messagesContainer, { force, prevSnapshot: snap })
      })
    },
    async loadMessages() {
      if (!this.sessionId) return
      try {
        const res = await api.getMessages(this.sessionId)
        this.logItems = res.data || []
        this.scrollChatToBottom(true)
      } catch (e) {
        console.error('Load messages failed:', e)
      }
    },
    async loadDefaultModel() {
      try {
        const configRes = await api.getConfig('defaultModel')
        if (configRes.data?.value) {
          this.modelName = configRes.data.value
        }
      } catch (e) {
        console.error('Load default model failed:', e)
      }
    },
    openModelSelector() {
      this.modelSelectVisible = true
    },
    onModelSelected(model) {
      const parts = model.name.split('/')
      this.modelName = parts.length > 2 ? parts.slice(1).join('/') : model.name
      api.setConfig('defaultModel', this.modelName)
    },
    openCommandDialog() {
      this.commandDialogVisible = true
    },
    handleExecuteCommand(cmd) {
      this.inputMessage = cmd + ' '
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.input-area textarea')
        if (textarea) {
          textarea.focus()
        }
      })
    },
    openFileSelect() {
      this.fileSelectVisible = true
    },
    onFileSelected(filePath) {
      const atIndex = this.inputMessage.lastIndexOf('@')
      if (atIndex !== -1) {
        this.inputMessage = this.inputMessage.slice(0, atIndex) + filePath + ' '
      } else {
        this.inputMessage += filePath + ' '
      }
      this.cancelFileSelect()
    },
    cancelFileSelect() {
      this.fileSelectVisible = false
    },
    openSkillSelect() {
      const textarea = this.$el.querySelector('.input-area textarea')
      this.skillCursorPos = textarea ? textarea.selectionStart : -1
      this.skillSelectVisible = true
    },
    onSkillSelected(skillName) {
      const tag = `[${skillName}] `
      const pos = this.skillCursorPos >= 0 ? this.skillCursorPos : 0
      this.inputMessage = this.inputMessage.slice(0, pos) + tag + this.inputMessage.slice(pos)
      this.cancelSkillSelect()
    },
    cancelSkillSelect() {
      this.skillSelectVisible = false
    },
    openDesignSelect() {
      this.designSelectVisible = true
    },
    onDesignSelected(design) {
      const tag = `[设计:${design.name}](${design.path}) `
      this.inputMessage += tag
      this.designSelectVisible = false
    },
    getTodoStatusIcon(status) {
      const icons = { completed: '✅', in_progress: '🔄', pending: '⬜', cancelled: '❌' }
      return icons[status] || '⬜'
    },
    formatInput(action, input) {
      try {
        const parsed = JSON.parse(input)
        if (action === 'bash' || action === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ` (${parsed.workdir})` : '')
        }
        if (action === 'read_file') {
          return parsed.file_path + (parsed.offset ? `:${parsed.offset}` : '')
        }
        if (action === 'edit_file' || action === 'write_file') {
          return parsed.file_path
        }
        if (action === 'glob' || action === 'find_files') {
          return parsed.pattern + (parsed.directory ? ` (${parsed.directory})` : '')
        }
        if (action === 'grep' || action === 'search_content') {
          return `"${parsed.pattern}" (${parsed.directory || ''})`
        }
        return input
      } catch {
        return input
      }
    },
    renderMarkdown(text) {
      return text ? marked(text) : ''
    },
    openCustomActions() {
      window.open('/#/views/pc/custom-actions', '_blank')
    },
    async loadCustomActions() {
      try {
        const res = await api.getCustomActions('design')
        this.customActions = res.data || []
      } catch (e) {
        console.error('Load custom actions failed:', e)
      }
    },
    executeCustomAction(action) {
      this.inputMessage = action.prompt
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.input-area textarea')
        if (textarea) textarea.focus()
        if (action.auto_send) {
          this.sendMessage()
        }
      })
    },
    startResize(e) {
      this.isResizing = true
      this.startX = e.clientX
      this.startWidth = this.chatPanelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    handleResize(e) {
      if (!this.isResizing) return
      const delta = this.startX - e.clientX
      let newWidth = this.startWidth + delta
      const container = this.$el.querySelector('.step2-main')
      const maxWidth = container ? container.clientWidth * this.maxChatWidthRatio : 800
      if (newWidth < this.minChatWidth) newWidth = this.minChatWidth
      if (newWidth > maxWidth) newWidth = maxWidth
      this.chatPanelWidth = newWidth
    },
    stopResize() {
      this.isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }
}
</script>

<style scoped>
.step2-container { height: 100%; display: flex; flex-direction: column; }
.step2-main { display: flex; flex: 1; gap: 5px; overflow: hidden; padding: 16px; }
.editor-panel { flex: 1; min-width: 300px; background: var(--color-panelHeader); border: 1px solid var(--color-contentBg); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.editor-header { background: var(--color-panelHeader); border-bottom: 1px solid var(--color-contentBg); padding: 12px 16px; font-size: 13px; color: var(--color-textMuted); display: flex; align-items: center; justify-content: space-between; }
.editor-title { display: flex; align-items: center; gap: 8px; }
.editor-actions { display: flex; gap: 4px; align-items: center; }
.editor-actions .el-button--text { color: var(--color-textMuted); padding: 2px 6px; font-size: 16px; }
.editor-actions .el-button--text:hover { color: var(--color-accent); }
.editor-container { flex: 1; min-height: 0; }
.chat-panel { background: var(--color-panelHeader); border: 1px solid var(--color-contentBg); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; flex-shrink: 0; }
.resize-handle { width: 4px; cursor: col-resize; background: transparent; flex-shrink: 0; transition: background 0.15s; }
.resize-handle:hover { background: var(--color-accent); }
.panel-header { background: var(--color-panelHeader); border-bottom: 1px solid var(--color-contentBg); padding: 12px 16px; font-size: 14px; font-weight: 500; color: var(--color-textMain); flex-shrink: 0; }
.panel-tabs { display: flex; gap: 0; padding: 0; }
.panel-tab { flex: 1; text-align: center; padding: 10px 16px; cursor: pointer; color: var(--color-textMuted); font-size: 13px; border-bottom: 2px solid transparent; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.panel-tab:hover { color: var(--color-textMain); }
.panel-tab.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
.chat-messages { flex: 1; overflow-y: auto; padding: 0 16px 16px; font-size: 14px; line-height: 1.6; }
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
.chat-messages::-webkit-scrollbar-thumb:hover { background: var(--color-textMuted); }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-textMuted); }
.empty-state i { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.todos-list { margin-bottom: 16px; color: var(--color-textMain); }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.user-question {
  color: var(--color-accent);
  font-weight: bold;
  border: 1px solid var(--color-accent);
  padding: 15px;
  margin: 15px;
  border-radius: 10px;
  display: inline-block;
  max-width: 80%;
  text-align: left;
}
.ai-thought { color: var(--color-textMain); margin-bottom: 16px; }
.log-mute { color: var(--color-textMuted); margin-bottom: 16px; white-space: pre; }
.tool-success { color: #22c55e; }
.tool-fail { color: #ef4444; }
.tool-input { color: var(--color-accent); margin-left: 8px; }
.build-info { color: var(--color-textMuted); display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.chat-input-area { padding: 12px 16px; background: var(--color-panelHeader); border-top: 1px solid var(--color-contentBg); }
.input-panel { background: var(--color-panel); border-radius: 6px; border: 1px solid var(--color-border); overflow: hidden; }
.input-wrapper { position: relative; }
.input-area { flex: 1; }
.input-area ::v-deep .el-textarea__inner { border: none; border-radius: 0; background: var(--color-panel); color: var(--color-textMain); resize: none; }
.input-area ::v-deep .el-textarea__inner:focus { box-shadow: none; }
.input-panel .input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  gap: 6px;
  background: var(--color-panel);
}
.input-actions-left { display: flex; align-items: center; gap: 6px; }
.input-actions-right { display: flex; align-items: center; gap: 6px; }
.input-panel .status-action { cursor: pointer; font-size: 12px; color: var(--color-textMuted); }
.input-panel .status-action:hover { color: var(--color-accent); }
.input-panel .separator { color: var(--color-border); font-size: 12px; }
.status-bar { display: flex; gap: 8px; align-items: center; padding: 6px 16px; font-size: 12px; color: var(--color-textMuted); border-top: 1px solid var(--color-contentBg); flex-shrink: 0; flex-wrap: wrap; background: var(--color-panel); }
.status-bar .separator { color: var(--color-border); }
.status-ready { color: #22c55e; }
.status-thinking { color: var(--color-accent); }
.thinking-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.model-selector { cursor: pointer; }
.model-selector:hover { color: var(--color-accent); }
.status-action { cursor: pointer; }
.status-action:hover { color: var(--color-accent); }
.chat-images { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.chat-image-thumb {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  transition: border-color 0.2s;
}
.chat-image-thumb:hover { border-color: var(--color-accent); }
.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 30px;
  color: #fff;
  font-size: 40px;
  cursor: pointer;
  z-index: 1;
}
.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: default;
}
.upload-btn { height: auto; }
</style>
