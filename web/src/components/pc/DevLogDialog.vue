<template>
  <el-dialog
    :visible.sync="dialogVisible"
    title="开发记录"
    width="80%"
    :close-on-click-modal="false"
  >
    <div class="devlog-content" v-html="renderedContent"></div>
    <span slot="footer" class="dialog-footer">
      <el-button @click="close">关闭</el-button>
      <el-button type="primary" @click="refresh">刷新</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { marked } from 'marked'

export default {
  name: 'DevLogDialog',
  props: {
    visible: { type: Boolean, default: false },
    sessionId: { type: String, default: '' }
  },
  data() {
    return {
      content: ''
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    renderedContent() {
      return this.content ? marked(this.content) : '<p style="color: #84848a;">暂无记录</p>'
    }
  },
  watch: {
    visible(val) {
      if (val && this.sessionId) {
        this.loadDevLog()
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:visible', false)
    },
    async refresh() {
      await this.loadDevLog()
    },
    async loadDevLog() {
      if (!this.sessionId) return
      try {
        const res = await fetch(`/api/devlog?sessionId=${this.sessionId}`)
        const data = await res.json()
        if (data.success) {
          this.content = data.data?.content || ''
        }
      } catch (e) {
        console.error('加载开发日志失败:', e)
      }
    }
  }
}
</script>

<style scoped>
.devlog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px;
  background: #1e1e1e;
  border-radius: 4px;
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.6;
}
.devlog-content :deep(h1),
.devlog-content :deep(h2),
.devlog-content :deep(h3) {
  color: #f4f4f5;
  margin: 16px 0 8px;
}
.devlog-content :deep(ul),
.devlog-content :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}
.devlog-content :deep(code) {
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
</style>