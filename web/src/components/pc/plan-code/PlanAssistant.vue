<template>
  <div class="plan-assistant" :class="{ hidden: !visible }" :style="visible ? { width: width + 'px' } : {}">
    <div class="assistant-tabs">
      <button class="assistant-tab" :class="{ active: activeTab === 'design' }" @click="activeTab = 'design'">AI生成方案</button>
      <button class="assistant-tab" :class="{ active: activeTab === 'discuss' }" @click="activeTab = 'discuss'">AI方案交流</button>
    </div>

    <!-- Tab: AI生成方案 -->
    <div class="tab-panel" :class="{ hidden: activeTab !== 'design' }">
      <div class="assistant-chat-messages" ref="designMsgs">
        <div v-if="!designPanel.logItems || designPanel.logItems.length === 0" class="assistant-empty">
          <p>输入需求描述，AI将协助您完善方案。</p>
        </div>
        <template v-for="(item, idx) in (designPanel.logItems || [])">
          <div v-if="item.type === 'todos'" :key="'td-' + idx" class="todos-list">
            <div v-for="(todo, tIdx) in item.todos" :key="'ti-' + tIdx" class="todo-item">
              <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
              <span class="todo-name">{{ todo.name }}</span>
            </div>
          </div>
          <div v-else-if="item.type === 'chat'" :key="'dc-' + idx" class="flex justify-end">
            <div class="user-question">
              <div v-if="item.mediaFiles && item.mediaFiles.length" class="chat-images">
                <img v-for="mf in item.mediaFiles" :key="mf.filePath" :src="mf.url || mf.dataUrl || mf.filePath" class="chat-image-thumb" @click.stop="openImagePreview(mf)" />
              </div>
              <div>{{ item.content }}</div>
            </div>
          </div>
          <div v-else-if="item.type === 'think'" :key="'dt-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
          <template v-else-if="item.type === 'step'" :key="'ds-' + idx">
            <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
            <div v-for="(tc, aIdx) in item.toolCalls" :key="'dst-' + aIdx" class="log-mute">
              <template v-if="tc.status === 'executing'">
                <span class="tool-spinner"></span>
                {{ getToolCallName(tc) }}
                <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
              </template>
              <template v-else>
                <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
                {{ getToolCallName(tc) }}
                <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
              </template>
            </div>
          </template>
        </template>
        <div class="build-info" v-if="designPanel.modelName">
          <span class="icon">▣</span> Build · {{ designPanel.modelName }}
        </div>
      </div>

      <div class="assistant-input-area">
        <div v-if="designPanel.mediaFiles && designPanel.mediaFiles.length" class="image-preview-wrap">
          <ImagePreviewList
            :files="designPanel.mediaFiles"
            :disabled="designPanel.disabled"
            @remove="(id) => removeMedia(designPanel, id)"
          />
        </div>
        <div class="assistant-input-panel">
          <div class="input-wrapper">
            <ResizableTextarea
              v-model="designPanel.input"
              :rows="4"
              placeholder="输入需求描述... (Enter 发送, Ctrl+Enter 换行)"
              :disabled="designPanel.disabled"
              class="input-area"
              @keydown.enter.native="handleDesignKeydown"
              @paste-image="(files) => handlePasteImages(designPanel, files)"
            />
            <input type="file" accept="image/*" multiple ref="designImgInput" style="display:none" @change="(e) => handleImageSelected(e, designPanel)" />
          </div>
          <div class="input-actions">
            <div class="input-actions-left">
              <span class="status-action" @click="fileSelectVisible = true" @mousedown.prevent>选择文件</span>
              <span class="separator">|</span>
              <span class="status-action" @click="skillSelectVisible = true" @mousedown.prevent>选择Skill</span>
              <span class="separator">|</span>
              <span class="status-action" @click="designSelectVisible = true" @mousedown.prevent>选择设计</span>
              <span class="separator">|</span>
              <span class="status-action" @click="commandDialogVisible = true" @mousedown.prevent>命令</span>
            </div>
            <div class="input-actions-right">
              <button class="action-btn btn-upload" @click="handleDesignImageUpload" :disabled="designPanel.disabled">图片</button>
              <button v-if="designPanel.disabled && !designPanel.stopping" class="action-btn btn-stop" @click="$emit('stopDesign')">■ 停止</button>
              <button v-else-if="designPanel.stopping" class="action-btn btn-stop" disabled>停止中...</button>
              <button v-else class="btn-send" :disabled="!designPanel.input.trim() && (!designPanel.mediaFiles || !designPanel.mediaFiles.length)" @click="$emit('sendDesign')">发送</button>
            </div>
          </div>
        </div>
      </div>

      <div class="status-bar">
        <span :class="designPanel.sessionStatus === 'processing' || designPanel.disabled ? 'status-thinking' : 'status-ready'">
          <span v-if="designPanel.sessionStatus === 'processing' || designPanel.disabled" class="thinking-spinner"></span>
          {{ designPanel.sessionStatus === 'processing' || designPanel.disabled ? '思考中' : '✓ 就绪' }}
        </span>
        <span class="sep">|</span>
        <span class="model-selector" @click="$emit('openModel')" @mousedown.prevent>模型: {{ designPanel.modelName || '-' }} ▾</span>
        <span class="sep">|</span>
        <span>会话: {{ designPanel.sessionId ? designPanel.sessionId.slice(0, 8) : '未创建' }}</span>
        <span class="sep">|</span>
        <span>token: {{ designPanel.promptTokens || 0 }}</span>
      </div>
    </div>

    <!-- Tab: AI方案交流 -->
    <div class="tab-panel" :class="{ hidden: activeTab !== 'discuss' }">
      <div class="discuss-dropdown" v-if="discussSessions.length > 0">
        <div class="dropdown-trigger" @click="dropdownOpen = !dropdownOpen">
          <span class="dropdown-title">{{ currentDiscuss ? currentDiscuss.title : '选择探讨' }}</span>
          <span class="dropdown-arrow" :class="{ rotated: dropdownOpen }">▾</span>
        </div>
        <div class="dropdown-menu" v-if="dropdownOpen">
          <div
            v-for="disc in discussSessions"
            :key="disc.id"
            class="dropdown-item"
            :class="{ active: currentDiscuss && currentDiscuss.id === disc.id }"
          >
            <span class="item-title" @click="switchDiscuss(disc)">{{ disc.title }}</span>
            <span class="item-actions" @click.stop>
              <span class="menu-trigger" @click.stop="menuId = menuId === disc.id ? null : disc.id">⋮</span>
              <div class="disc-menu-popup" v-if="menuId === disc.id">
                <div class="menu-item" @click.stop="startRename(disc)">重命名</div>
                <div class="menu-item danger" @click.stop="confirmDelete(disc)">删除</div>
              </div>
            </span>
          </div>
          <div class="dropdown-item add-item" @click="createDiscuss">+ 新建探讨</div>
        </div>
      </div>

      <div v-if="discussSessions.length === 0" class="assistant-empty" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;" @click="createDiscuss">
        <p>与AI探讨方案内容，不会修改方案文件</p>
        <button class="btn-send" style="margin-top:8px;">新建探讨</button>
      </div>

      <template v-if="currentDiscuss">
        <div class="assistant-chat-messages" ref="discussMsgs">
          <template v-for="(item, idx) in (discussPanel.logItems || [])">
            <div v-if="item.type === 'todos'" :key="'dt-' + idx" class="todos-list">
              <div v-for="(todo, tIdx) in item.todos" :key="'di-' + tIdx" class="todo-item">
                <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
                <span class="todo-name">{{ todo.name }}</span>
              </div>
            </div>
            <div v-else-if="item.type === 'chat'" :key="'dc2-' + idx" class="flex justify-end">
              <div class="user-question">
                <div v-if="item.mediaFiles && item.mediaFiles.length" class="chat-images">
                  <img v-for="mf in item.mediaFiles" :key="mf.filePath" :src="mf.url || mf.dataUrl || mf.filePath" class="chat-image-thumb" @click.stop="openImagePreview(mf)" />
                </div>
                <div>{{ item.content }}</div>
              </div>
            </div>
            <div v-else-if="item.type === 'think'" :key="'dt2-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
            <template v-else-if="item.type === 'step'" :key="'ds2-' + idx">
              <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
              <div v-for="(tc, aIdx) in item.toolCalls" :key="'dst2-' + aIdx" class="log-mute">
                <template v-if="tc.status === 'executing'">
                  <span class="tool-spinner"></span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </template>
                <template v-else>
                  <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
                  {{ getToolCallName(tc) }}
                  <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
                </template>
              </div>
            </template>
          </template>
          <div class="build-info" v-if="discussPanel.modelName">
            <span class="icon">▣</span> Build · {{ discussPanel.modelName }}
          </div>
        </div>

        <div class="assistant-input-area">
          <div v-if="discussPanel.mediaFiles && discussPanel.mediaFiles.length" class="image-preview-wrap">
            <ImagePreviewList
              :files="discussPanel.mediaFiles"
              :disabled="discussPanel.disabled"
              @remove="(id) => removeMedia(discussPanel, id)"
            />
          </div>
          <div class="assistant-input-panel">
            <div class="input-wrapper">
              <ResizableTextarea
                v-model="discussPanel.input"
                :rows="4"
                placeholder="与AI探讨方案... (Enter 发送, Ctrl+Enter 换行)"
                :disabled="discussPanel.disabled"
                class="input-area"
                @keydown.enter.native="handleDiscussKeydown"
                @paste-image="(files) => handlePasteImages(discussPanel, files)"
              />
              <input type="file" accept="image/*" multiple ref="discussImgInput" style="display:none" @change="(e) => handleImageSelected(e, discussPanel)" />
            </div>
            <div class="input-actions">
              <div class="input-actions-left">
                <span class="status-action" @click="fileSelectVisible = true" @mousedown.prevent>选择文件</span>
                <span class="separator">|</span>
                <span class="status-action" @click="skillSelectVisible = true" @mousedown.prevent>选择Skill</span>
                <span class="separator">|</span>
                <span class="status-action" @click="designSelectVisible = true" @mousedown.prevent>选择设计</span>
                <span class="separator">|</span>
                <span class="status-action" @click="commandDialogVisible = true" @mousedown.prevent>命令</span>
              </div>
              <div class="input-actions-right">
                <button class="action-btn btn-upload" @click="handleDiscussImageUpload" :disabled="discussPanel.disabled">图片</button>
                <button v-if="discussPanel.disabled && !discussPanel.stopping" class="action-btn btn-stop" @click="$emit('stopDiscuss')">■ 停止</button>
                <button v-else-if="discussPanel.stopping" class="action-btn btn-stop" disabled>停止中...</button>
                <button v-else class="btn-send" :disabled="!discussPanel.input.trim() && (!discussPanel.mediaFiles || !discussPanel.mediaFiles.length)" @click="$emit('sendDiscuss')">发送</button>
              </div>
            </div>
          </div>
        </div>

        <div class="status-bar">
          <span :class="discussPanel.sessionStatus === 'processing' || discussPanel.disabled ? 'status-thinking' : 'status-ready'">
            <span v-if="discussPanel.sessionStatus === 'processing' || discussPanel.disabled" class="thinking-spinner"></span>
            {{ discussPanel.sessionStatus === 'processing' || discussPanel.disabled ? '思考中' : '✓ 就绪' }}
          </span>
          <span class="sep">|</span>
          <span>会话: {{ discussPanel.sessionId ? discussPanel.sessionId.slice(0, 8) : '未创建' }}</span>
          <span class="sep">|</span>
          <span>token: {{ discussPanel.promptTokens || 0 }}</span>
        </div>
      </template>
    </div>

    <el-dialog :visible.sync="renameVisible" title="重命名探讨" width="400px" :close-on-click-modal="false">
      <el-input v-model="renameValue" placeholder="请输入新名称" @keydown.enter.native="doRename"></el-input>
      <span slot="footer">
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" @click="doRename" :disabled="!renameValue.trim()">确定</el-button>
      </span>
    </el-dialog>

    <el-dialog :visible.sync="deleteVisible" title="确认删除" width="360px" :close-on-click-modal="false">
      <p>确定要删除探讨「{{ deleteTarget ? deleteTarget.title : '' }}」吗？</p>
      <span slot="footer">
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" @click="doDelete">删除</el-button>
      </span>
    </el-dialog>

    <FileSelectDialog
      :visible.sync="fileSelectVisible"
      @select="onFileSelected"
      @close="fileSelectVisible = false"
    />
    <SkillSelectDialog
      :visible.sync="skillSelectVisible"
      @select="onSkillSelected"
      @close="skillSelectVisible = false"
    />
    <DesignSelectDialog
      :visible.sync="designSelectVisible"
      @select="onDesignSelected"
      @close="designSelectVisible = false"
    />
    <CommandDialog
      :visible.sync="commandDialogVisible"
      @execute="handleExecuteCommand"
    />

    <div v-if="previewImage" class="image-lightbox" @click="closeImagePreview">
      <span class="lightbox-close" @click="closeImagePreview">&times;</span>
      <img :src="previewImage.url || previewImage.dataUrl || previewImage.filePath" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script>
import { getTodoStatusIcon, getToolCallName, getToolCallArguments, formatInput, renderMarkdown } from '../../../lib/render.js'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'
import ResizableTextarea from '../chat/ResizableTextarea.vue'
import ImagePreviewList from '../chat/ImagePreviewList.vue'
import FileSelectDialog from '../file/FileSelectDialog.vue'
import SkillSelectDialog from '../skill/SkillSelectDialog.vue'
import DesignSelectDialog from '../design/DesignSelectDialog.vue'
import CommandDialog from '../common/CommandDialog.vue'
import { uploadSingleMedia } from '../../../api/chat/media.js'

export default {
  name: 'PlanAssistant',
  components: { ResizableTextarea, ImagePreviewList, FileSelectDialog, SkillSelectDialog, DesignSelectDialog, CommandDialog },
  props: {
    visible: { type: Boolean, default: false },
    width: { type: Number, default: 420 },
    designPanel: { type: Object, required: true },
    discussPanel: { type: Object, required: true },
    discussSessions: { type: Array, default: () => [] },
    currentDiscuss: { type: Object, default: null },
    planFilePath: { type: String, default: '' },
  },
  data() {
    return {
      activeTab: 'design',
      dropdownOpen: false,
      menuId: null,
      renameVisible: false,
      renameValue: '',
      renameTarget: null,
      deleteVisible: false,
      deleteTarget: null,
      fileSelectVisible: false,
      skillSelectVisible: false,
      designSelectVisible: false,
      commandDialogVisible: false,
      previewImage: null,
    }
  },
  watch: {
    visible(val) { if (val) this.scrollAllToBottom() },
  },
  mounted() { document.addEventListener('mousedown', this.onMouseDown) },
  beforeDestroy() { document.removeEventListener('mousedown', this.onMouseDown) },
  methods: {
    getTodoStatusIcon,
    getToolCallName,
    getToolCallArguments,
    formatInput,
    renderMarkdown,

    onMouseDown(e) {
      if (this.menuId && !e.target.closest('.item-actions')) this.menuId = null
      if (this.dropdownOpen && !e.target.closest('.discuss-dropdown')) this.dropdownOpen = false
    },

    switchDiscuss(disc) { this.dropdownOpen = false; this.$emit('switchDiscuss', disc) },
    createDiscuss() { this.dropdownOpen = false; this.$emit('createDiscuss') },

    startRename(disc) { this.menuId = null; this.renameTarget = disc; this.renameValue = disc.title; this.renameVisible = true },
    doRename() { if (!this.renameValue.trim() || !this.renameTarget) return; this.$emit('renameDiscuss', this.renameTarget, this.renameValue.trim()); this.renameVisible = false; this.renameTarget = null },
    confirmDelete(disc) { this.menuId = null; this.deleteTarget = disc; this.deleteVisible = true },
    doDelete() { if (!this.deleteTarget) return; this.$emit('deleteDiscuss', this.deleteTarget); this.deleteVisible = false; this.deleteTarget = null },

    scrollDesignToBottom(force = false) {
      const snap = snapshotScroll(this.$refs.designMsgs)
      this.$nextTick(() => {
        const el = this.$refs.designMsgs
        if (el) scrollToBottom(el, { force, prevSnapshot: snap })
      })
    },
    scrollDiscussToBottom(force = false) {
      const snap = snapshotScroll(this.$refs.discussMsgs)
      this.$nextTick(() => {
        const el = this.$refs.discussMsgs
        if (el) scrollToBottom(el, { force, prevSnapshot: snap })
      })
    },
    scrollAllToBottom() { this.scrollDesignToBottom(); this.scrollDiscussToBottom() },

    handleDesignKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const textarea = e.target
          const start = textarea.selectionStart; const end = textarea.selectionEnd
          this.designPanel.input = this.designPanel.input.substring(0, start) + '\n' + this.designPanel.input.substring(end)
          this.$nextTick(() => { textarea.selectionStart = textarea.selectionEnd = start + 1 })
        } else {
          e.preventDefault()
          if (!this.designPanel.disabled) this.$emit('sendDesign')
        }
      }
    },

    handleDiscussKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          const textarea = e.target
          const start = textarea.selectionStart; const end = textarea.selectionEnd
          this.discussPanel.input = this.discussPanel.input.substring(0, start) + '\n' + this.discussPanel.input.substring(end)
          this.$nextTick(() => { textarea.selectionStart = textarea.selectionEnd = start + 1 })
        } else {
          e.preventDefault()
          if (!this.discussPanel.disabled) this.$emit('sendDiscuss')
        }
      }
    },

    handleDesignImageUpload() {
      const el = this.$refs.designImgInput
      if (el) (Array.isArray(el) ? el[0] : el).click()
    },
    handleDiscussImageUpload() {
      const el = this.$refs.discussImgInput
      if (el) (Array.isArray(el) ? el[0] : el).click()
    },

    async handleImageSelected(e, panel) {
      const files = e.target.files; if (!files || !files.length) return
      const a = Array.from(files); e.target.value = ''
      await this._uploadFiles(a, panel)
    },

    async handlePasteImages(panel, files) {
      if (panel.disabled) return
      await this._uploadFiles(files, panel)
    },

    async _uploadFiles(files, panel) {
      const max = 5; const cur = (panel.mediaFiles || []).length; const rem = max - cur
      if (rem <= 0) { this.$message.warning('最多上传5张图片'); return }
      const n = Math.min(files.length, rem)
      if (!panel.mediaFiles) panel.mediaFiles = []
      for (let i = 0; i < n; i++) {
        const f = files[i]
        panel.mediaFiles.push({ id: Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2), name: f.name || 'paste.png', dataUrl: '', filePath: '', type: f.type || 'image/png', uploading: true })
      }
      const startIdx = panel.mediaFiles.length - n
      for (let i = 0; i < n; i++) {
        const idx = startIdx + i
        try {
          const r = await uploadSingleMedia(files[i])
          Object.assign(panel.mediaFiles[idx], { dataUrl: r.dataUrl, filePath: r.filePath, type: r.type, uploading: false })
        } catch {
          panel.mediaFiles.splice(idx, 1)
        }
      }
    },

    removeMedia(panel, id) {
      const i = (panel.mediaFiles || []).findIndex(f => f.id === id)
      if (i > -1) panel.mediaFiles.splice(i, 1)
    },

    openImagePreview(mf) { this.previewImage = mf },
    closeImagePreview() { this.previewImage = null },

    onFileSelected(path) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      panel.input = panel.input + path + ' '
      this.fileSelectVisible = false
    },
    onSkillSelected(name) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      panel.input = '[Skill:' + name + '] ' + panel.input
      this.skillSelectVisible = false
    },
    onDesignSelected(design) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      const tag = `[设计:${design.name}](${design.path}) `
      panel.input += tag
      this.designSelectVisible = false
    },
    handleExecuteCommand(cmd) {
      const panel = this.activeTab === 'design' ? this.designPanel : this.discussPanel
      panel.input = cmd + ' '
      this.$nextTick(() => {
        const textarea = this.$el.querySelector('.tab-panel:not(.hidden) .input-area textarea')
        if (textarea) textarea.focus()
      })
    },
  },
}
</script>

<style scoped>
.plan-assistant {
  width: 420px;
  min-width: 280px;
  background: var(--color-panelHeader);
  border: 1px solid var(--color-contentBg);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}
.plan-assistant.hidden { display: none; }

.assistant-tabs { display: flex; background: var(--color-panelHeader); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.assistant-tab {
  flex: 1; text-align: center; padding: 10px 12px; cursor: pointer; color: var(--color-textMuted);
  font-size: 12px; font-family: inherit; background: transparent; border: none;
  border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap;
}
.assistant-tab:hover { color: var(--color-textMain); }
.assistant-tab.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }

.tab-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.tab-panel.hidden { display: none; }

.assistant-chat-messages { flex: 1; overflow-y: auto; padding: 12px 16px 16px; font-size: 14px; line-height: 1.5; }
.assistant-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-textMuted); gap: 8px; }

.assistant-input-area { background: #ffffff;  flex-shrink: 0; }
.assistant-input-area ::v-deep .el-textarea__inner { background: #ffffff; border: none; resize: none; box-shadow: none; color: #333333; }
.assistant-input-area ::v-deep .el-textarea__inner:focus { border: none; box-shadow: none; }
.assistant-input-area ::v-deep .el-textarea__inner::placeholder { color: #999999; }
.assistant-input-area .status-action { color: #666666; }
.assistant-input-area .status-action:hover { color: #6366f1; }
.assistant-input-area .separator { color: #d1d5db; }
.assistant-input-area .btn-upload { border-color: #d1d5db; color: #666666; }
.assistant-input-area .btn-upload:hover { border-color: #6366f1; color: #6366f1; }

.input-wrapper { position: relative; }

.input-actions { display: flex; justify-content: space-between; align-items: center;  gap: 6px; flex-wrap: wrap; padding: 0px 8px;}
.input-actions.input-actions-right { justify-content: flex-end; }
.input-actions-left { display: flex; align-items: center; gap: 6px; }
.input-actions-right { display: flex; align-items: center; gap: 6px; }

.btn-send {
  padding: 4px 14px; font-size: 12px; border: none; border-radius: 5px;
  cursor: pointer; font-family: inherit;
  background: var(--color-accent); color: #fff;
}
.btn-send:hover { background: #818cf8; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

.action-btn { font-size: 12px; padding: 5px 12px; border-radius: 5px; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-upload { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-upload:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-upload:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: var(--color-danger, #ef4444); color: #fff; }

.status-bar { display: flex; gap: 8px; align-items: center; padding: 6px 16px; font-size: 12px; color: var(--color-textMuted); border-top: 1px solid var(--color-contentBg); flex-shrink: 0; flex-wrap: wrap; background: var(--color-panel); }
.sep { color: var(--color-border); }
.separator { color: var(--color-border); font-size: 12px; }
.status-ready { color: var(--color-success, #22c55e); }
.status-thinking { color: var(--color-accent); display: flex; align-items: center; gap: 6px; }
.status-action { cursor: pointer; font-size: 12px; color: var(--color-textMuted); }
.status-action:hover { color: var(--color-accent); }
.model-selector { cursor: pointer; }
.model-selector:hover { color: var(--color-accent); }

.thinking-spinner { width: 10px; height: 10px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.user-question { color: var(--color-accent); font-weight: 600; border: 1px solid var(--color-accent); padding: 8px 12px; margin: 8px 0 8px auto; border-radius: 10px; display: inline-block; max-width: 85%; word-break: break-word; }
.ai-thought { color: var(--color-textMain); margin-bottom: 12px; line-height: 1.6; }
.log-mute { color: var(--color-textMuted); margin-bottom: 8px; font-size: 13px; }
.tool-success { color: var(--color-success, #22c55e); }
.tool-fail { color: var(--color-danger, #ef4444); }
.tool-input { color: var(--color-accent); margin-left: 6px; }
.build-info { color: var(--color-textMuted); display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; }
.build-info .icon { color: var(--color-accent); font-size: 11px; }
.todos-list { margin-bottom: 12px; color: var(--color-textMain); }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 13px; }

.discuss-dropdown { position: relative; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.dropdown-trigger { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; font-size: 13px; color: var(--color-textMain); }
.dropdown-trigger:hover { background: var(--color-hoverBg, #1e1e30); }
.dropdown-arrow { font-size: 10px; transition: transform 0.2s; color: var(--color-textMuted); }
.dropdown-arrow.rotated { transform: rotate(180deg); }
.dropdown-menu { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: var(--color-panelHeader); border: 1px solid var(--color-border); border-radius: 0 0 6px 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); max-height: 200px; overflow-y: auto; }
.dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-size: 13px; cursor: pointer; color: var(--color-textMain); }
.dropdown-item:hover { background: var(--color-hoverBg, #1e1e30); }
.dropdown-item.active { color: var(--color-accent); }
.dropdown-item.add-item { color: var(--color-accent); justify-content: center; gap: 6px; }
.item-actions { display: flex; align-items: center; position: relative; }
.menu-trigger { cursor: pointer; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
.menu-trigger:hover { background: rgba(255,255,255,0.08); }
.disc-menu-popup { position: absolute; right: 0; top: 100%; z-index: 101; min-width: 80px; background: var(--color-panelHeader); border: 1px solid var(--color-border); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); padding: 4px; }
.disc-menu-popup .menu-item { padding: 6px 12px; font-size: 12px; cursor: pointer; border-radius: 4px; color: var(--color-textMain); }
.disc-menu-popup .menu-item:hover { background: rgba(255,255,255,0.06); }
.disc-menu-popup .menu-item.danger { color: var(--color-danger, #ef4444); }

.chat-images { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.chat-image-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; }

.image-lightbox { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.lightbox-close { position: absolute; top: 20px; right: 30px; font-size: 30px; color: #fff; cursor: pointer; }
.lightbox-image { max-width: 90%; max-height: 90%; border-radius: 8px; }

.image-preview-wrap {
  padding: 4px 8px;
  background: var(--color-inputBg, #f0f0f0);
  border-bottom: 1px solid var(--color-border, #e5e5e5);
}

.tool-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px; vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
