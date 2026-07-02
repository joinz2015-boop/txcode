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
        <button
          v-for="action in customActions"
          :key="action.id"
          class="action-btn btn-custom"
          @click="$emit('action', action)"
          :disabled="panel.disabled"
        >{{ action.name }}</button>
        <button class="action-btn btn-upload" @click="triggerUpload" :disabled="panel.disabled">图片</button>
        <button
          v-if="planFilePath"
          class="action-btn btn-dev-plan"
          @click="$emit('fill-dev-plan')"
          :disabled="panel.disabled"
          title="根据方案开发"
        >📋 方案开发</button>
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
  },
  computed: {
    canSend() {
      const p = this.panel
      const hasText = p.input && p.input.trim()
      const hasMedia = (p.mediaFiles || []).filter(f => !f.uploading).length > 0
      return hasText || hasMedia
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
  display: flex;
  gap: 6px;
  z-index: 5;
}

.input-wrapper ::v-deep .el-textarea__inner {
  padding-bottom: 50px;
}

.action-btn { font-size: 12px; padding: 5px 12px; border-radius: 5px; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-upload { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-upload:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-upload:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-dev-plan { background: transparent; border: 1px solid var(--color-accent); color: var(--color-accent); font-size: 11px; }
.btn-dev-plan:hover { background: var(--color-accent); color: #fff; }
.btn-dev-plan:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-custom { background: transparent; border: 1px solid var(--color-border); color: var(--color-textMuted); }
.btn-custom:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-custom:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-stop { background: var(--color-danger, #ef4444); color: #fff; }
.btn-send { background: var(--color-accent); color: #fff; }
.btn-send:hover { background: #818cf8; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
