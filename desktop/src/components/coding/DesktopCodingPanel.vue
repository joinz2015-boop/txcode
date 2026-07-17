<template>
  <div class="coding-panel">
    <div class="panel-header">
      <span class="panel-header-title"># {{ sessionTitle }}</span>
      <span class="content-header-badge">{{ currentAgent }}</span>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="logItems.length === 0" class="welcome">
        <div class="welcome-logo">T</div>
        <h2 class="welcome-title">{{ currentSession && !panel.sessionId ? '新方案会话' : '欢迎使用 txcode' }}</h2>
        <p class="welcome-desc">{{ currentSession && !panel.sessionId ? '发送第一条消息后将自动创建编码会话' : 'AI 编码助手 · 选择左侧会话开始' }}</p>
      </div>
      <DesktopChatMessage
        v-for="(item, idx) in logItems"
        :key="item.logId || idx"
        :item="item"
      />
      <div v-if="disabled && !stopping" class="chat-msg">
        <div class="chat-msg-avatar ai">AI</div>
        <div class="chat-msg-content">
          <div class="chat-msg-header">{{ currentAgent }} · 正在输入...</div>
          <div class="chat-msg-text">
            <span class="typing-dot">●</span>
            <span class="typing-dot">●</span>
            <span class="typing-dot">●</span>
          </div>
        </div>
      </div>
    </div>
    <div class="code-input-block">
      <DesktopImagePreviewList
        :files="mediaFiles"
        :disabled="disabled"
        @remove="removeMedia"
      />
      <div class="code-input-wrapper">
        <textarea
          class="code-textarea"
          v-model="inputText"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行，可粘贴图片)"
          rows="3"
          :disabled="disabled"
          @keydown="handleKeydown"
          @paste="handlePaste"
        ></textarea>
        <div class="code-input-actions">
          <div class="code-input-actions-left">
            <button class="fn-btn" @mousedown.prevent @click="showFileDialog = true" title="选择文件">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              文件
            </button>
            <button class="fn-btn" @mousedown.prevent @click="showSkillDialog = true" title="选择 Skill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Skill
            </button>
            <button class="fn-btn" @mousedown.prevent @click="showDesignDialog = true" title="选择设计">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              设计
            </button>
            <button class="fn-btn" @mousedown.prevent @click="showCommandDialog = true" title="命令">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              命令
            </button>
            <button class="fn-btn" @mousedown.prevent @click="triggerImageUpload" title="上传图片">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              图片
            </button>
            <input ref="imageInput" type="file" accept="image/*" multiple style="display:none" @change="handleImageFiles" />
            <span class="input-sep">|</span>
            <span class="input-status" :style="{ color: disabled ? '#f59e0b' : '#22c55e' }">
              {{ disabled ? (stopping ? '■ 停止中' : '● 处理中') : '✓ 就绪' }}
            </span>
            <span class="input-sep">|</span>
            <span class="input-action" @click="openModelSelect">模型: {{ panel.modelName || currentModel }} ▾</span>
            <span class="input-sep">|</span>
            <span>会话: {{ sessionIdDisplay }}</span>
            <span class="input-sep">|</span>
            <span>token: {{ panel.promptTokens }}</span>
            <template v-if="selectedFiles.length > 0">
              <span class="input-sep">|</span>
              <span class="input-action" @click="clearSelectedFiles" title="清除已选文件">{{ selectedFiles.length }} 文件</span>
            </template>
            <template v-if="selectedSkills.length > 0">
              <span class="input-sep">|</span>
              <span class="input-action" @click="clearSelectedSkills" title="清除已选Skill">{{ selectedSkills.length }} Skill</span>
            </template>
            <template v-if="selectedDesigns.length > 0">
              <span class="input-sep">|</span>
              <span class="input-action" @click="clearSelectedDesigns" title="清除已选设计">{{ selectedDesigns.length }} 设计</span>
            </template>
            <template v-if="planFilePath">
              <span class="input-sep">|</span>
              <span class="input-action" @click="fillDevPlan">生成代码</span>
            </template>
            <span class="input-sep">|</span>
            <button class="fn-btn" @mousedown.prevent @click="handleTest" title="测试">测试</button>
            <button class="fn-btn" @mousedown.prevent @click="handleGitChanges" title="Git变更">Git</button>
          </div>
          <div class="code-input-actions-right">
            <button v-if="disabled && !stopping" class="input-btn btn-stop" @click="stopSending">■ 停止</button>
            <button v-if="disabled && stopping" class="input-btn btn-stop" disabled>停止中...</button>
            <button class="input-btn btn-send-code" @click="sendMessage" :disabled="disabled">发送</button>
          </div>
        </div>
      </div>
    </div>

    <DesktopFileSelectDialog v-if="showFileDialog" @close="showFileDialog = false" @select="onFileSelected" />
    <DesktopSkillSelectDialog v-if="showSkillDialog" @close="showSkillDialog = false" @select="onSkillSelected" />
    <DesktopDesignSelectDialog v-if="showDesignDialog" @close="showDesignDialog = false" @select="onDesignSelected" />
    <DesktopCommandDialog v-if="showCommandDialog" @close="showCommandDialog = false" @select="onCommandSelected" />
  </div>
</template>

<script>
import DesktopChatMessage from './DesktopChatMessage.vue'
import DesktopFileSelectDialog from '@/components/file/DesktopFileSelectDialog.vue'
import DesktopSkillSelectDialog from '@/components/skill/DesktopSkillSelectDialog.vue'
import DesktopDesignSelectDialog from '@/components/design/DesktopDesignSelectDialog.vue'
import DesktopCommandDialog from '@/components/common/DesktopCommandDialog.vue'
import DesktopImagePreviewList from '@/components/chat/DesktopImagePreviewList.vue'
import { getItem, setItem } from '@/utils/storage'
import { createSession, getMessages } from '@/api/index'
import { saveMeta } from '@/api/index'
import { uploadChatImage } from '@/api/index'
import { ws } from '@/utils/websocket'

let logSeq = 0
let mediaIdCounter = 0

export default {
  name: 'DesktopCodingPanel',
  components: {
    DesktopChatMessage,
    DesktopFileSelectDialog,
    DesktopSkillSelectDialog,
    DesktopDesignSelectDialog,
    DesktopCommandDialog,
    DesktopImagePreviewList
  },
  props: {
    currentAgent: { type: String, default: 'Code Agent' },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null },
    runningSessionIds: { type: Array, default: () => [] },
    planFilePath: { type: String, default: '' }
  },
  data() {
    return {
      inputText: '',
      panel: this.createPanel(),
      stopping: false,
      showFileDialog: false,
      showSkillDialog: false,
      showDesignDialog: false,
      showCommandDialog: false,
      selectedFiles: [],
      selectedSkills: [],
      selectedDesigns: [],
      mediaFiles: []
    }
  },
  computed: {
    logItems() {
      return this.panel.logItems
    },
    disabled() {
      return this.panel.disabled
    },
    sessionTitle() {
      if (this.currentSession) {
        return this.currentSession.meta.sessionName || this.currentSession.folderName || 'AI 编码对话'
      }
      return 'AI 编码对话'
    },
    sessionIdDisplay() {
      return this.panel.sessionId ? 'sess_' + this.panel.sessionId.substring(0, 8) : '未创建'
    }
  },
  watch: {
    currentSession: {
      handler(val, oldVal) {
        if (!val) {
          this.unsubscribePanel()
          this.panel = this.createPanel()
          return
        }
        if (oldVal && oldVal.folderName === val.folderName) return
        this.initSession(val)
      },
      immediate: true
    },
    runningSessionIds(ids) {
      if (this.panel.sessionId && ids.includes(this.panel.sessionId)) {
        this.panel.disabled = true
      } else {
        this.panel.disabled = false
      }
    }
  },
  methods: {
    createPanel() {
      return {
        sessionId: null,
        logItems: [],
        disabled: false,
        modelName: '',
        promptTokens: 0,
        wsUnsubscribe: null
      }
    },

    async initSession(session) {
      this.saveCodeScrollTop()
      this.unsubscribePanel()
      this.panel = this.createPanel()

      const meta = session.meta || {}
      if (meta.codeSessionId) {
        this.panel.sessionId = meta.codeSessionId
        await this.loadMessages(meta.codeSessionId)
        this.subscribePanel(meta.codeSessionId)
      }
      if (this.currentModel) {
        this.panel.modelName = this.currentModel
      }
      this.$nextTick(() => this.restoreCodeScrollTop())
    },

    saveCodeScrollTop() {
      const el = this.$refs.messagesContainer
      if (el) {
        setItem('coding:scrollTop', el.scrollTop)
      }
    },

    restoreCodeScrollTop() {
      const el = this.$refs.messagesContainer
      if (el) {
        const top = getItem('coding:scrollTop', 0)
        if (top > 0) {
          this.$nextTick(() => { el.scrollTop = top })
        }
      }
    },

    unsubscribePanel() {
      if (this.panel.wsUnsubscribe) {
        this.panel.wsUnsubscribe()
        this.panel.wsUnsubscribe = null
      }
    },

    async ensureCodeSession() {
      let sid = this.panel.sessionId
      if (!sid) {
        const sessionName = this.currentSession ? (this.currentSession.meta.sessionName || this.currentSession.folderName) : '新会话'
        const r = await createSession(sessionName)
        sid = r.data.id
        this.panel.sessionId = sid

        if (this.currentSession) {
          const meta = { ...this.currentSession.meta, codeSessionId: sid, updatedAt: new Date().toISOString() }
          await saveMeta(this.currentSession.folderName, meta)
          this.currentSession.meta = meta
          setItem('planSession:current', this.currentSession)
        }
      }
      return sid
    },

    subscribePanel(sessionId) {
      if (!sessionId) return
      if (this.panel.wsUnsubscribe) this.panel.wsUnsubscribe()

      this.panel.wsUnsubscribe = ws.subscribe(sessionId, {
        step: (d) => {
          const hasExecuting = d.toolCalls && d.toolCalls.some(tc => tc.status === 'executing')
          if (hasExecuting) {
            this.panel.logItems = this.panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.panel.logItems.push(this.withLogId({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration, _executing: true }))
          } else {
            this.panel.logItems = this.panel.logItems.filter(
              item => !(item.type === 'step' && item.iteration === d.iteration && item._executing)
            )
            this.pushLogItem({ type: 'step', thought: d.reasoning || d.thought, toolCalls: d.toolCalls, success: d.success, iteration: d.iteration })
          }
          if (d.usage && d.usage.promptTokens) this.panel.promptTokens = d.usage.promptTokens
          this.$nextTick(() => this.scrollToBottom())
        },
        done: (d) => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          if (d.modelName) this.panel.modelName = d.modelName
          if (d.usage && d.usage.promptTokens) this.panel.promptTokens = d.usage.promptTokens
          if (d.response) {
            this.pushLogItem({ type: 'think', content: d.response })
            this.$nextTick(() => this.scrollToBottom())
          }
        },
        stopped: () => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          this.pushLogItem({ type: 'think', content: '【已停止】' })
          this.$nextTick(() => this.scrollToBottom())
        },
        error: (d) => {
          this.panel.logItems = this.panel.logItems.filter(item => !(item.type === 'step' && item._executing))
          this.panel.disabled = false
          this.stopping = false
          alert(d.error || '发生错误')
        },
        todos: (d) => {
          this.pushLogItem({ type: 'todos', todos: d.todos })
          this.$nextTick(() => this.scrollToBottom())
        },
        compact: () => {
          if (this.panel.sessionId) this.loadMessages(this.panel.sessionId)
        },
        running_sessions: (d) => {
          const runningIds = d.runningSessionIds || []
          if (this.panel.sessionId && runningIds.includes(this.panel.sessionId)) {
            this.panel.disabled = true
          } else {
            this.panel.disabled = false
          }
        }
      })
    },

    async loadMessages(sessionId) {
      try {
        const r = await getMessages(sessionId)
        this.panel.logItems = (r.data || []).map(i => {
          if (i.type === 'think') return this.withLogId({ type: 'think', content: i.content || '' })
          if (i.type === 'step') return this.withLogId(i)
          return this.withLogId(i)
        })
      } catch (e) {
        this.panel.logItems = []
      }
      this.$nextTick(() => this.scrollToBottom())
    },

    pushLogItem(item) {
      this.panel.logItems.push(this.withLogId(item))
      const max = 400
      if (this.panel.logItems.length > max) {
        this.panel.logItems.splice(0, this.panel.logItems.length - max)
      }
    },

    withLogId(item) {
      return { ...item, logId: ++logSeq }
    },

    open(data) {
      if (data && data.sessionId) {
        this.unsubscribePanel()
        this.panel = this.createPanel()
        this.panel.sessionId = data.sessionId
        this.subscribePanel(data.sessionId)
        this.loadMessages(data.sessionId)
      }
    },

    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },

    handlePaste(e) {
      const items = e.clipboardData && e.clipboardData.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) this.processMediaFile(file)
        }
      }
    },

    triggerImageUpload() {
      this.$refs.imageInput && this.$refs.imageInput.click()
    },

    handleImageFiles(e) {
      const files = e.target.files
      if (!files) return
      for (const file of files) {
        this.processMediaFile(file)
      }
      e.target.value = ''
    },

    processMediaFile(file) {
      if (!file.type.startsWith('image/')) return
      const id = 'media_' + (++mediaIdCounter)
      const reader = new FileReader()
      reader.onload = () => {
        this.mediaFiles.push({ id, file, dataUrl: reader.result, uploading: false })
      }
      reader.readAsDataURL(file)
    },

    async uploadMediaAndGetUrls() {
      const sessionId = this.panel.sessionId
      if (!sessionId || this.mediaFiles.length === 0) return []
      const results = []
      for (const mf of this.mediaFiles) {
        if (mf.uploading) continue
        mf.uploading = true
        try {
          const r = await uploadChatImage(mf.file, sessionId)
          if (r.data && r.data.url) results.push(r.data.url)
        } catch (e) {
          console.error('图片上传失败:', e)
        } finally {
          mf.uploading = false
        }
      }
      return results
    },

    removeMedia(id) {
      this.mediaFiles = this.mediaFiles.filter(m => m.id !== id)
    },

    onFileSelected(path) {
      if (!this.selectedFiles.includes(path)) {
        this.selectedFiles.push(path)
      }
      this.showFileDialog = false
    },

    onSkillSelected(name) {
      if (!this.selectedSkills.includes(name)) {
        this.selectedSkills.push(name)
      }
      this.showSkillDialog = false
    },

    onDesignSelected(path) {
      if (!this.selectedDesigns.includes(path)) {
        this.selectedDesigns.push(path)
      }
      this.showDesignDialog = false
    },

    onCommandSelected(cmd) {
      this.inputText = cmd + ' ' + this.inputText
      this.showCommandDialog = false
    },

    clearSelectedFiles() { this.selectedFiles = [] },
    clearSelectedSkills() { this.selectedSkills = [] },
    clearSelectedDesigns() { this.selectedDesigns = [] },

    handleTest() {
      if (!this.panel.sessionId) return
      ws.send('chat', {
        message: '请运行项目测试',
        sessionId: this.panel.sessionId,
        modelName: this.panel.modelName || undefined
      })
    },

    handleGitChanges() {
      if (!this.panel.sessionId) return
      ws.send('chat', {
        message: '请查看 git 变更状态',
        sessionId: this.panel.sessionId,
        modelName: this.panel.modelName || undefined
      })
    },

    buildMessagePrefix() {
      let prefix = ''
      if (this.selectedFiles.length > 0) {
        prefix += '参考文件:\n' + this.selectedFiles.map(f => '- ' + f).join('\n') + '\n'
      }
      if (this.selectedSkills.length > 0) {
        prefix += '使用的Skill:\n' + this.selectedSkills.map(s => '- ' + s).join('\n') + '\n'
      }
      if (this.selectedDesigns.length > 0) {
        prefix += '参考设计:\n' + this.selectedDesigns.map(d => '- ' + d).join('\n') + '\n'
      }
      if (this.planFilePath) {
        prefix += '方案文件: ' + this.planFilePath + '\n'
      }
      return prefix
    },

    async sendMessage() {
      const val = this.inputText.trim()
      if (!val || this.panel.disabled) return

      try {
        const sid = await this.ensureCodeSession()
        this.subscribePanel(sid)

        const imageUrls = await this.uploadMediaAndGetUrls()
        const prefix = this.buildMessagePrefix()
        let fullMessage = val
        if (prefix) fullMessage = prefix + '\n用户输入: ' + val
        if (imageUrls.length > 0) fullMessage += '\n图片: ' + imageUrls.join(', ')

        const payload = {
          message: fullMessage,
          sessionId: sid,
          modelName: this.panel.modelName || undefined
        }
        this.pushLogItem({ type: 'chat', content: val, role: 'user' })
        this.inputText = ''
        this.mediaFiles = []
        this.panel.disabled = true
        this.stopping = false
        ws.send('chat', payload)

        if (this.currentSession && this.currentSession.meta.sessionName === '新计划会话') {
          ws.send('name_session', { sessionId: sid, folderName: this.currentSession.folderName, userInput: val })
        }
        this.$nextTick(() => this.scrollToBottom())
      } catch (e) {
        console.error('发送失败:', e)
        alert('发送失败: ' + e.message)
      }
    },

    stopSending() {
      if (!this.panel.sessionId || this.stopping) return
      this.stopping = true
      ws.send('stop', { sessionId: this.panel.sessionId })
    },

    openModelSelect() {
      this.$emit('update:agent', this.currentAgent)
      this.$emit('update:model', this.currentModel)
    },

    fillDevPlan() {
      if (!this.planFilePath) return
      this.inputText = `请根据以下方案文件生成代码：${this.planFilePath}`
    },

    scrollToBottom() {
      const el = this.$refs.messagesContainer
      if (el) {
        this.$nextTick(() => {
          el.scrollTop = el.scrollHeight
        })
      }
    }
  }
}
</script>

<style scoped>
.coding-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  background: var(--bg-chat);
}
.panel-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.content-header-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.welcome {
  text-align: center;
  padding: 32px 0 20px;
}
.welcome-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 16px rgba(79,110,247,0.25);
}
.welcome-title {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.welcome-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-muted);
}
.code-input-block {
  background: var(--bg-input);
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.code-input-wrapper {
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.code-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  line-height: 1.5;
  background: transparent;
  min-height: 60px;
}
.code-textarea:disabled {
  opacity: 0.7;
  background: #f9fafb;
}
.code-textarea::placeholder {
  color: var(--text-muted);
}
.code-input-actions {
  display: flex;
  gap: 0;
  flex-wrap: wrap;
  align-items: center;
  font-size: 11.5px;
  color: var(--text-muted);
  padding: 5px 10px;
  border-top: 1px solid var(--border);
  justify-content: space-between;
}
.code-input-actions-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.code-input-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.fn-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.fn-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}
.input-status { font-weight: 500; }
.input-sep { color: var(--border); user-select: none; }
.input-action { cursor: pointer; transition: color 0.15s; }
.input-action:hover { color: var(--accent); }
.input-btn {
  font-size: 11.5px;
  padding: 4px 11px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-stop { background: #ef4444; color: #fff; }
.btn-stop:hover { background: #dc2626; }
.btn-stop:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-send-code { background: var(--accent); color: #fff; }
.btn-send-code:hover { background: #6366f1; }
.btn-send-code:disabled { opacity: 0.6; cursor: not-allowed; }

.chat-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.chat-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.chat-msg-avatar.ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff;
}
.chat-msg-content { flex: 1; min-width: 0; }
.chat-msg-header {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 3px;
}
.chat-msg-text {
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.65;
  background: #f8f9fb;
  padding: 10px 14px;
  border-radius: 2px 10px 10px 10px;
  border: 1px solid var(--border);
}
@keyframes typing {
  0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; }
}
.typing-dot { animation: typing 1.4s ease-in-out infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
</style>
