<template>
  <div class="input-block">
    <ImagePreviewList
      v-if="panel.mediaFiles && panel.mediaFiles.length"
      :files="panel.mediaFiles"
      :disabled="panel.disabled"
      @remove="(id) => $emit('remove-media', id)"
    />
    <div class="input-wrapper">
      <ResizableTextarea
        :value="panel.input"
        @input="panel.input = $event"
        :rows="5"
        :placeholder="placeholder"
        :disabled="panel.disabled"
        class="code-input-area"
        @keydown.enter.native="onKeydown"
        @paste-image="(files) => $emit('paste-image', files)"
      />
      <input type="file" accept="image/*" multiple ref="imgInput" style="display:none" @change="onFileSelected" />
      <div class="input-actions">
        <span :class="panel.disabled ? 'status-thinking' : 'status-ready'">
          <span v-if="panel.disabled" class="thinking-spinner"></span>
          {{ panel.disabled ? '思考中' : '✓ 就绪' }}
        </span>
        <span class="sep">|</span>
        <span class="status-action" @click="$emit('open-model')" @mousedown.prevent>模型: {{ panel.modelName || '-' }} ▾</span>
        <span class="sep">|</span>
        <span>会话: {{ shortSessionId }}</span>
        <span class="sep">|</span>
        <span>token: {{ panel.promptTokens || 0 }}</span>
        <template v-for="action in statusActions">
          <span :key="action.event + '-sep'" class="sep">|</span>
          <span :key="action.event" class="status-action" @click="$emit('status-action', action.event)" @mousedown.prevent>{{ action.label }}</span>
        </template>
        <span class="sep">|</span>
        <span class="status-action" @click="$emit('open-test')" @mousedown.prevent>测试</span>
        <span class="sep">|</span>
        <span
          v-if="planFilePath"
          class="status-action"
          @click="$emit('fill-dev-plan')"
          @mousedown.prevent
        >方案开发</span>
        <div class="actions-spacer"></div>
        <button
          v-for="action in customActions"
          :key="action.id"
          class="action-btn btn-custom"
          @click="$emit('action', action)"
          :disabled="panel.disabled"
        >{{ action.name }}</button>
        <button class="action-btn btn-upload" @click="triggerUpload" :disabled="panel.disabled">图片</button>
        <button v-if="panel.disabled && !panel.stopping" class="action-btn btn-stop" @click="$emit('stop')">■ 停止</button>
        <button v-else-if="panel.stopping" class="action-btn btn-stop" disabled>停止中...</button>
        <button v-else class="action-btn btn-send" :disabled="!canSend" @click="$emit('send')">发送</button>
      </div>
    </div>
  </div>
</template>

<script>
import ImagePreviewList from './ImagePreviewList.vue'
import ResizableTextarea from './ResizableTextarea.vue'

export default {
  name: 'ChatInputArea',
  components: { ImagePreviewList, ResizableTextarea },
  props: {
    panel: { type: Object, required: true },
    placeholder: { type: String, default: '输入消息...' },
    customActions: { type: Array, default: () => [] },
    planFilePath: { type: String, default: '' },
    statusActions: { type: Array, default: () => [] },
    sessionId: { type: String, default: '' },
  },
  computed: {
    canSend() {
      const p = this.panel
      const hasText = p.input && p.input.trim()
      const hasMedia = (p.mediaFiles || []).filter(f => !f.uploading).length > 0
      return hasText || hasMedia
    },
    shortSessionId() {
      return this.sessionId ? this.sessionId.slice(0, 8) : '未创建'
    },
  },
  methods: {
    onKeydown(e) {
      if (e.ctrlKey) {
        const t = e.target
        const s = t.selectionStart
        const end = t.selectionEnd
        this.panel.input = this.panel.input.substring(0, s) + '\n' + this.panel.input.substring(end)
        this.$nextTick(() => { t.selectionStart = t.selectionEnd = s + 1 })
      } else {
        e.preventDefault()
        if (!this.panel.disabled && this.canSend) this.$emit('send')
      }
    },
    triggerUpload() {
      const el = this.$refs.imgInput
      if (el) (Array.isArray(el) ? el[0] : el).click()
    },
    onFileSelected(e) {
      const files = e.target.files
      if (!files || !files.length) return
      this.$emit('files-selected', Array.from(files))
      e.target.value = ''
    },
  },
}
</script>

<style scoped>
.input-block {
  background-color: var(--color-inputBg);
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.input-wrapper { position: relative; flex: 1; }

.code-input-area { flex: 1; }

.input-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  z-index: 5;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  color: var(--color-textMuted);
}

.input-wrapper ::v-deep .el-textarea__inner {
  padding-bottom: 70px;
}

.sep { color: var(--color-border); }
.status-ready { color: var(--color-success, #22c55e); }
.status-thinking { color: var(--color-accent); display: flex; align-items: center; gap: 6px; }
.status-action { cursor: pointer; }
.status-action:hover { color: var(--color-accent); }
.thinking-spinner { width: 10px; height: 10px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.actions-spacer { flex: 1; }

.action-btn { font-size: 12px; padding: 5px 12px; border-radius: 5px; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-upload { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-upload:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-upload:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-custom { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-custom:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-custom:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: var(--color-danger, #ef4444); color: #fff; }
.btn-send { background: var(--color-accent); color: #fff; }
.btn-send:hover { background: #818cf8; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
