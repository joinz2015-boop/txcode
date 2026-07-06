<template>
  <div class="editor-panel" :class="{ visible }">
    <div class="editor-header">
      <div class="editor-title">
        <span class="file-icon">📄</span>
        <span class="file-path">{{ planFilePath || '未选择方案文件' }}</span>
      </div>
      <div class="editor-actions">
        <button title="保存方案 (Ctrl+S)" @click="doSave">✓</button>
        <button title="刷新方案" @click="$emit('refresh')">↻</button>
        <button title="导出方案" @click="$emit('export')">⬇</button>
        <button title="新建子方案" @click="$emit('create-sub-scheme')">+</button>
      </div>
    </div>
    <div ref="editorContainer" class="editor-container"></div>
    <button
      v-if="planFilePath"
      class="generate-code-btn"
      title="生成代码"
      @click="$emit('generate-code')"
    >生成代码</button>
    <div class="status-bar">
      <span class="status-ready">✓ Markdown</span>
      <span class="sep">|</span>
      <span>UTF-8</span>
    </div>
  </div>
</template>

<script>
import * as monaco from 'monaco-editor'

export default {
  name: 'PlanEditor',
  props: {
    visible: { type: Boolean, default: false },
    content: { type: String, default: '' },
    planFilePath: { type: String, default: '' },
  },
  data() {
    return { editor: null, ready: false }
  },
  watch: {
    content(val) {
      if (!this.editor) return
      const v = val || ''
      if (this.editor.getValue() !== v) this.editor.setValue(v)
    },
    visible(val) {
      if (val) this.$nextTick(() => { this.initEditor(); this.layout() })
    },
  },
  mounted() { this.$nextTick(() => this.initEditor()) },
  beforeDestroy() { if (this.editor) { this.editor.dispose(); this.editor = null } },
  methods: {
    initEditor() {
      if (this.editor) return
      const el = this.$refs.editorContainer
      if (!el) return
      this.editor = monaco.editor.create(el, {
        value: this.content || '',
        language: 'markdown',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollbar: { useShadows: false, vertical: 'auto', horizontal: 'auto' },
      })
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => this.doSave())
      this.ready = true
    },
    getValue() { return this.editor ? this.editor.getValue() : '' },
    setValue(val) { if (this.editor) this.editor.setValue(val || '') },
    layout() { if (this.editor) this.$nextTick(() => this.editor.layout()) },
    doSave() { this.$emit('save', this.getValue()) },
  },
}
</script>

<style scoped>
.editor-panel {
  flex: 1;
  display: none;
  flex-direction: column;
  background: var(--color-panelHeader);
  border: 1px solid var(--color-contentBg);
  border-radius: 8px;
  min-width: 0;
  overflow: hidden;
  position: relative;
}
.editor-panel.visible { display: flex; }

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-contentBg);
  font-size: 13px;
  color: var(--color-textMuted);
  flex-shrink: 0;
}
.editor-title { display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; margin-right: 12px; }
.file-icon { color: var(--color-textMuted); font-size: 14px; }
.file-path { color: var(--color-textMuted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.editor-actions { display: flex; gap: 2px; align-items: center; flex-shrink: 0; }
.editor-actions button {
  background: transparent; border: none; color: var(--color-textMuted);
  cursor: pointer; padding: 4px 8px; font-size: 15px; border-radius: 4px;
  font-family: inherit; transition: all 0.15s;
}
.editor-actions button:hover { color: var(--color-accent); }

.editor-container { flex: 1; min-height: 0; background: #0d0d1a; overflow: hidden; }
.editor-container ::v-deep .monaco-scrollable-element > .scrollbar > .slider {
  border-radius: 4px;
}
.editor-container ::v-deep .monaco-scrollable-element > .scrollbar.vertical > .slider {
  width: 6px !important;
  margin-left: 2px;
}
.editor-container ::v-deep .monaco-scrollable-element > .scrollbar.horizontal > .slider {
  height: 6px !important;
  margin-top: 2px;
}

.generate-code-btn {
  position: absolute;
  bottom: 44px;
  right: 24px;
  z-index: 10;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  padding: 0;
  line-height: 1.2;
  white-space: nowrap;
}
.generate-code-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.status-bar {
  display: flex; gap: 8px; align-items: center;
  padding: 6px 16px; font-size: 12px;
  color: var(--color-textMuted);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
.sep { color: var(--color-border); }
.status-ready { color: var(--color-success, #22c55e); }
</style>
