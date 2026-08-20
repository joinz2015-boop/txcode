<template>
  <div class="plan-editor-preview" v-html="previewHtml"></div>
</template>

<script>
export default {
  name: 'DesktopPlanPreview',
  props: {
    content: { type: String, default: '' }
  },
  computed: {
    previewHtml() {
      return this.renderMarkdown(this.content)
    }
  },
  methods: {
    renderMarkdown(text) {
      if (!text) return '<p style="color:var(--text-muted);">暂无内容</p>'
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/((?:<li>.*?<\/li><br>?)+)/g, (m) => '<ul>' + m.replace(/<br>/g, '') + '</ul>')
    }
  }
}
</script>

<style scoped>
.plan-editor-preview { padding: 2px 0; }
.plan-editor-preview h1 {
  font-size: 19px; font-weight: 700; margin: 14px 0 6px;
  color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 6px;
}
.plan-editor-preview h2 { font-size: 16px; font-weight: 600; margin: 12px 0 5px; color: var(--text-primary); }
.plan-editor-preview h3 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
.plan-editor-preview p { margin: 5px 0; line-height: 1.7; }
.plan-editor-preview ul { padding-left: 20px; margin: 4px 0; }
.plan-editor-preview ol { padding-left: 20px; margin: 4px 0; }
.plan-editor-preview li { margin: 2px 0; }
.plan-editor-preview code { background: #f1f2f6; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
.plan-editor-preview pre { background: #f1f2f6; border-radius: 6px; padding: 10px 14px; overflow-x: auto; margin: 8px 0; border: 1px solid #e5e5ea; }
</style>
