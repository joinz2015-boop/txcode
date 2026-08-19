<template>
  <div v-if="visible" class="copy-overlay" @click.self="close">
    <div class="copy-dialog">
      <div class="copy-dialog-header">
        <span>{{ isDir ? '复制文件夹链接' : '复制文件链接' }}</span>
        <button class="copy-dialog-close" @click="close">&times;</button>
      </div>
      <div class="copy-dialog-body">
        <div class="copy-dialog-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>{{ isDir ? '文件夹路径' : '文件路径' }}</span>
        </div>
        <input
          ref="input"
          class="copy-link-input"
          readonly
          spellcheck="false"
          :value="link ? link.url : ''"
          :title="link ? link.path : ''"
          @click="$event.target.select()"
        />
        <div class="copy-hint">非 HTTPS 环境无法自动复制时，请手动选择文本后 Ctrl+C 复制</div>
      </div>
      <div class="copy-dialog-footer">
        <button class="copy-btn-outline" @click="close">取消</button>
        <button class="copy-btn" :class="{ copied }" @click="doCopy">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopCopyLinkDialog',
  props: {
    visible: { type: Boolean, default: false },
    link: { type: Object, default: null }
  },
  data() {
    return {
      copied: false
    }
  },
  computed: {
    isDir() {
      return !!(this.link && this.link.isDir)
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.copied = false
        this.$nextTick(() => {
          const input = this.$refs.input
          if (input) {
            input.focus()
            input.select()
          }
        })
        document.addEventListener('keydown', this.onKeydown)
      } else {
        document.removeEventListener('keydown', this.onKeydown)
      }
    }
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    onKeydown(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      this.$emit('close')
    },
    doCopy() {
      const val = this.link && this.link.url
      if (!val) return
      const done = () => {
        this.copied = true
        this.$emit('toast', { msg: '链接已复制到剪贴板', type: 'ok' })
        setTimeout(() => {
          this.copied = false
        }, 1800)
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(val).then(done).catch(() => this.fallbackCopy(val, done))
      } else {
        this.fallbackCopy(val, done)
      }
    },
    fallbackCopy(text, done) {
      const input = this.$refs.input
      if (!input) return
      input.focus()
      input.select()
      input.setSelectionRange(0, text.length)
      try {
        if (document.execCommand('copy')) {
          done()
        } else {
          this.$emit('toast', { msg: '复制失败，请手动 Ctrl+C', type: 'err' })
        }
      } catch (e) {
        this.$emit('toast', { msg: '复制失败，请手动 Ctrl+C', type: 'err' })
      }
    }
  }
}
</script>

<style scoped>
.copy-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.copy-dialog {
  width: 460px;
  max-width: 90vw;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: dialogIn 0.18s ease;
}
@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.copy-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  user-select: none;
}
.copy-dialog-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.copy-dialog-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.copy-dialog-body {
  padding: 16px;
}
.copy-dialog-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}
.copy-link-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-input);
  font-size: 12.5px;
  color: var(--text-primary);
  outline: none;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  transition: border-color 0.15s;
}
.copy-link-input:focus {
  border-color: var(--accent);
  background: #fff;
}
.copy-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
  user-select: none;
}
.copy-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.copy-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.copy-btn:hover {
  background: #4752c4;
}
.copy-btn.copied {
  background: var(--green);
}
.copy-btn-outline {
  padding: 6px 14px;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.copy-btn-outline:hover {
  background: var(--bg-hover);
}
</style>
