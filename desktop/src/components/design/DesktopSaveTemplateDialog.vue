<template>
  <div v-show="visible" class="dialog-overlay" @click.self="cancel">
    <div class="dialog-box">
      <p class="dialog-title">保存为模版</p>
      <div class="dialog-field">
        <label class="dialog-label">模版名称</label>
        <input
          ref="nameInput"
          v-model="templateName"
          @keyup.enter="confirm"
          @keyup.escape="cancel"
          class="dialog-input"
          placeholder="输入模版名称"
        />
      </div>
      <div class="dialog-field">
        <label class="dialog-label">源文件</label>
        <div class="dialog-file-info">{{ relativePath }}</div>
      </div>
      <div class="dialog-actions">
        <button @click="cancel" class="dialog-btn">取消</button>
        <button @click="confirm" class="dialog-btn primary" :disabled="!templateName.trim() || saving">
          {{ saving ? '保存中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { getFileContent, writeFile, browseFilesystem, createDirectory } from '@/api/index'

const DESIGN_BASE = '.txcode/design'
const TEMPLATE_DIR = DESIGN_BASE + '/.template'

export default {
  name: 'DesktopSaveTemplateDialog',
  props: {
    visible: { type: Boolean, default: false },
    filePath: { type: String, default: '' },
    fileName: { type: String, default: '' }
  },
  data() {
    return {
      templateName: '',
      saving: false
    }
  },
  computed: {
    relativePath() {
      if (!this.filePath) return ''
      const normalized = this.filePath.replace(/\\/g, '/')
      const idx = normalized.indexOf('.txcode/design/')
      if (idx !== -1) return normalized.slice(idx)
      return normalized
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.templateName = this.fileName || ''
        this.$nextTick(() => {
          this.$refs.nameInput?.focus()
          this.$refs.nameInput?.select()
        })
      }
    }
  },
  methods: {
    cancel() {
      this.$emit('update:visible', false)
    },
    async confirm() {
      const name = this.templateName.trim()
      if (!name) return

      this.saving = true
      try {
        await createDirectory(TEMPLATE_DIR).catch(() => {})

        const res = await getFileContent(this.filePath)
        const content = res.data?.content || ''

        const templatePath = TEMPLATE_DIR + '/' + name
        await writeFile(templatePath, content)

        this.$emit('update:visible', false)
        this.$emit('success', templatePath)
      } catch (e) {
        alert('保存模版失败: ' + (e.message || e))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box {
  background: var(--bg-side); border: 1px solid var(--border);
  border-radius: 8px; padding: 20px; width: 380px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.dialog-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.dialog-field { margin-bottom: 12px; }
.dialog-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.dialog-input {
  width: 100%; padding: 7px 10px; font-size: 12px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); outline: none;
  font-family: inherit; box-sizing: border-box;
}
.dialog-input:focus { border-color: var(--accent); }
.dialog-file-info {
  padding: 6px 10px; font-size: 11px; color: var(--text-muted);
  background: var(--bg-input); border-radius: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
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
</style>
