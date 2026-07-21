<template>
  <div class="chat-panel">
    <div class="chat-header">AI 运维助手</div>
    <div class="chat-messages" ref="msgContainer">
      <div v-if="messages.length === 0" class="empty-hint">
        向 AI 发送消息，自动分析并执行远程命令
      </div>
      <div v-for="(msg, idx) in messages" :key="idx" class="msg-item" :class="msg.role">
        <div v-if="msg.role === 'user'" class="msg-bubble user-bubble">{{ msg.content }}</div>
        <div v-else-if="msg.role === 'assistant'" class="msg-bubble assistant-bubble" v-html="renderMarkdown(msg.content)"></div>
        <div v-else-if="msg.role === 'tool'" class="msg-bubble tool-bubble">
          <div class="tool-label">工具执行</div>
          <pre>{{ msg.content }}</pre>
        </div>
      </div>
      <div v-if="streaming" class="msg-item assistant">
        <div class="msg-bubble assistant-bubble" v-html="renderMarkdown(streamContent)"></div>
      </div>
      <div v-if="thinking" class="msg-item assistant">
        <div class="msg-bubble assistant-bubble thinking-bubble">思考中...</div>
      </div>
    </div>
    <div class="chat-input-area">
      <textarea
        v-model="input"
        class="chat-input"
        placeholder="输入运维需求，如：检查磁盘使用情况"
        rows="2"
        :disabled="disabled"
        @keydown.enter.exact.prevent="handleSend"
      ></textarea>
      <button
        class="send-btn"
        :disabled="disabled || !input.trim()"
        @click="handleSend"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AiChatPanel',
  props: {
    disabled: Boolean,
    ws: Object,
    sessionId: String,
  },
  data() {
    return {
      messages: [],
      input: '',
      streamContent: '',
      streaming: false,
      thinking: false,
    }
  },
  methods: {
    renderMarkdown(text) {
      if (!text) return ''
      return text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.+)$/gm, '&bull; $1')
    },

    handleSend() {
      const msg = this.input.trim()
      if (!msg || this.disabled) return
      this.messages.push({ role: 'user', content: msg })
      this.input = ''
      this.thinking = true
      this.$emit('send', msg)
      this.$nextTick(() => this.scrollBottom())
    },

    addAssistant(content) {
      this.messages.push({ role: 'assistant', content })
      this.$nextTick(() => this.scrollBottom())
    },

    addTool(content) {
      this.messages.push({ role: 'tool', content })
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
        this.messages.push({ role: 'assistant', content })
      }
      this.streamContent = ''
      this.$nextTick(() => this.scrollBottom())
    },

    setThinking(val) {
      this.thinking = val
    },

    clearMessages() {
      this.messages = []
      this.streamContent = ''
      this.streaming = false
      this.thinking = false
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
  background: #fafafa;
}
.chat-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty-hint {
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  margin-top: 40px;
}
.msg-item { display: flex; }
.msg-item.user { justify-content: flex-end; }
.msg-bubble {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}
.user-bubble {
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.assistant-bubble {
  background: #fff;
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
  color: var(--text-primary);
}
.tool-bubble {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  font-size: 12px;
  width: 100%;
}
.tool-bubble pre {
  margin: 4px 0 0;
  padding: 6px;
  background: #f8fafc;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
  white-space: pre-wrap;
}
.tool-label {
  font-size: 11px;
  color: #0369a1;
  font-weight: 600;
}
.thinking-bubble {
  color: var(--text-muted);
  font-style: italic;
}
.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.chat-input {
  flex: 1;
  resize: none;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  background: #fff;
}
.chat-input:focus { border-color: var(--accent); }
.chat-input:disabled { opacity: 0.5; }
.send-btn {
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.send-btn:hover { opacity: 0.9; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
