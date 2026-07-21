<template>
  <div class="chat-panel">
    <div class="chat-messages" ref="msgContainer">
      <div v-if="logItems.length === 0 && !thinking && !streaming" class="assistant-empty">
        向 AI 发送消息，自动分析并执行远程命令
      </div>
      <div v-for="(item, idx) in logItems" :key="idx">
        <div v-if="item.type === 'chat' && item.role === 'user'" class="msg-item user">
          <div class="amsg-text user-text">{{ item.content }}</div>
        </div>
        <div v-else-if="item.type === 'step'">
          <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
          <div v-for="(tc, tcIdx) in (item.toolCalls || [])" :key="tcIdx" class="log-mute">
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
        </div>
        <div v-else-if="item.type === 'think'" class="msg-item assistant">
          <div class="amsg-text ai-text" v-html="renderMarkdown(item.content)"></div>
        </div>
      </div>
      <div v-if="streaming" class="msg-item assistant">
        <div class="amsg-text ai-text" v-html="renderMarkdown(streamContent)"></div>
      </div>
      <div v-if="thinking" class="msg-item assistant">
        <div class="amsg-text ai-text" style="color:var(--text-muted)">思考中...</div>
      </div>
    </div>
    <div class="assistant-input-area">
      <div class="assistant-input-wrap">
        <DesktopResizableTextarea
          v-model="input"
          :rows="3"
          :minRows="2"
          :maxRows="15"
          placeholder="输入运维需求，如：检查磁盘使用情况"
          :disabled="disabled"
          @keydown.enter.exact.prevent="handleSend"
        />
        <div class="assistant-input-actions-row">
          <div class="input-actions-left"></div>
          <div class="input-actions-right">
            <button v-if="disabled" class="btn-stop" @click="handleStop">停止</button>
            <button v-else class="btn-send" :disabled="!input.trim()" @click="handleSend">发送</button>
          </div>
        </div>
      </div>
    </div>
    <div class="assistant-status-bar">
      <span :style="{ color: disabled ? '#f59e0b' : '#22c55e' }">
        <span v-if="disabled" class="thinking-spinner"></span>
        {{ disabled ? '处理中' : '✓ 就绪' }}
      </span>
      <span v-if="currentUsage.totalTokens > 0" class="sep">|</span>
      <span v-if="currentUsage.totalTokens > 0" class="token-stats">
        Prompt: {{ currentUsage.promptTokens }} | Completion: {{ currentUsage.completionTokens }} | Total: {{ currentUsage.totalTokens }}
      </span>
      <span class="sep">|</span>
      <span class="status-action" @click="$emit('open-model-select')" @mousedown.prevent>模型: {{ modelName }} ▾</span>
      <span class="sep">|</span>
      <span>会话: {{ sessionId ? sessionId.slice(0, 8) : '未创建' }}</span>
    </div>
  </div>
</template>

<script>
import DesktopResizableTextarea from '@/components/chat/DesktopResizableTextarea.vue'
import { marked } from 'marked'

export default {
  name: 'AiChatPanel',
  components: { DesktopResizableTextarea },
  props: {
    disabled: Boolean,
    ws: Object,
    sessionId: String,
    modelName: { type: String, default: '' },
  },
  data() {
    return {
      logItems: [],
      input: '',
      streamContent: '',
      streaming: false,
      thinking: false,
      currentUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  },
  methods: {
    renderMarkdown(text) {
      if (!text) return ''
      try {
        return marked.parse(text)
      } catch {
        return this.escapeHtml(text)
      }
    },

    escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },

    getToolCallName(tc) {
      return tc ? (tc.function ? tc.function.name : tc.name) : 'unknown_tool'
    },

    getToolCallArguments(tc) {
      return tc && tc.function ? tc.function.arguments : (tc.arguments || '')
    },

    formatInput(action, input) {
      if (!input) return ''
      try {
        const parsed = JSON.parse(input)
        if (action === 'web_search') {
          return '"' + (parsed.query || '') + '"'
        }
        if (action === 'web_shell_exec') {
          return parsed.command || ''
        }
        if (action === 'bash') {
          return parsed.command + (parsed.workdir ? ' (' + parsed.workdir + ')' : '')
        }
        return input
      } catch {
        return input
      }
    },

    handleSend() {
      const msg = this.input.trim()
      if (!msg || this.disabled) return
      this.logItems.push({ type: 'chat', role: 'user', content: msg })
      this.input = ''
      this.thinking = true
      this.$emit('send', msg)
      this.$nextTick(() => this.scrollBottom())
    },

    handleStop() {
      this.$emit('stop')
    },

    addStep(data) {
      const hasExecuting = data.toolCalls && data.toolCalls.some(tc => tc.status === 'executing')
      if (hasExecuting) {
        this.logItems = this.logItems.filter(
          item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
        )
        this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration, _executing: true })
      } else {
        this.logItems = this.logItems.filter(
          item => !(item.type === 'step' && item.iteration === data.iteration && item._executing)
        )
        this.logItems.push({ type: 'step', thought: data.reasoning || data.thought, toolCalls: data.toolCalls, success: data.success, iteration: data.iteration })
      }
      this.$nextTick(() => this.scrollBottom())
    },

    addAssistant(content) {
      this.logItems.push({ type: 'think', content })
      this.$nextTick(() => this.scrollBottom())
    },

    setStreaming(content) {
      this.streaming = true
      this.streamContent = content
      this.thinking = false
      this.$nextTick(() => this.scrollBottom())
    },

    finishStreaming(content) {
      this.streaming = false
      this.thinking = false
      if (content) {
        this.logItems.push({ type: 'think', content })
      }
      this.streamContent = ''
      this.$nextTick(() => this.scrollBottom())
    },

    setThinking(val) {
      this.thinking = val
    },

    clearMessages() {
      this.logItems = []
      this.streamContent = ''
      this.streaming = false
      this.thinking = false
    },

    updateUsage(usage) {
      if (usage) {
        this.currentUsage = {
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          totalTokens: usage.totalTokens || 0,
        }
      }
    },

    scrollBottom() {
      const el = this.$refs.msgContainer
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    },
  },
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.assistant-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
.msg-item { margin-bottom: 8px; font-size: 12.5px; line-height: 1.6; }
.msg-item.user { text-align: right; }
.amsg-text {
  display: inline-block;
  max-width: 85%;
  padding: 6px 12px;
}
.user-text {
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 10px 2px 10px 10px;
  text-align: left;
}
.ai-text {
  background: var(--bg-input);
  color: var(--text-primary);
  border-radius: 2px 10px 10px 10px;
}
.ai-text :deep(p) { margin: 3px 0; }
.ai-text :deep(pre) { background: #f1f2f6; border-radius: 4px; padding: 6px 10px; font-size: 11px; overflow-x: auto; margin: 4px 0; }
.ai-text :deep(code) { background: #f1f2f6; padding: 1px 4px; border-radius: 3px; font-size: 11px; }

.ai-thought {
  color: var(--text-primary);
  margin-bottom: 10px;
  line-height: 1.6;
  font-size: 12.5px;
}
.ai-thought :deep(p) { margin: 4px 0; }

.log-mute { color: var(--text-muted); padding: 2px 0; font-size: 12px; }
.tool-success { color: #22c55e; font-weight: 600; }
.tool-fail { color: #ef4444; font-weight: 600; }
.tool-input { color: var(--accent); margin-left: 6px; font-size: 11.5px; }

.tool-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 3px;
}

.assistant-input-area {
  border-top: 1px solid var(--border);
  padding: 8px 10px;
  background: #fff;
}
.assistant-input-wrap {
  display: flex;
  flex-direction: column;
  background: var(--bg-input);
  border-radius: 8px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
}
.assistant-input-wrap:focus-within {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79,110,247,0.06);
}
.assistant-input-wrap :deep(textarea) { resize: none; }
.assistant-input-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-top: 1px solid var(--border);
  gap: 6px;
}
.input-actions-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.input-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-send {
  padding: 4px 14px;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  background: var(--accent);
  color: #fff;
}
.btn-send:hover { background: #6366f1; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-stop {
  padding: 4px 14px;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  background: #ef4444;
  color: #fff;
}
.btn-stop:hover { background: #dc2626; }

.assistant-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-top: 1px solid var(--border);
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--bg-titlebar);
}
.sep { color: var(--border); }
.token-stats {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-action {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
}
.status-action:hover { color: var(--accent); }

.thinking-spinner {
  width: 10px; height: 10px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
