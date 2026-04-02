<template>
  <div class="workflow-chat">
    <div class="prefix-hint" v-if="prefix">
      <i class="el-icon-info"></i>
      上下文：<code>{{ prefix }}</code>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="!messages.length" class="empty-state">
        <i class="el-icon-chat-dot-round"></i>
        <p>{{ emptyText }}</p>
      </div>
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['chat-message', msg.role]"
      >
        <div class="chat-bubble">{{ msg.content }}</div>
        <div class="chat-meta">
          {{ msg.role === 'user' ? '你' : 'AI' }} · {{ formatTime(msg.timestamp) }}
        </div>
      </div>
    </div>
    <div class="chat-input-area">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="2"
        :placeholder="placeholder"
        @keydown.enter.native="handleKeydown"
        resize="none"
      ></el-input>
      <el-button
        type="primary"
        :disabled="!inputMessage.trim() || !currentProject"
        @click="sendMessage"
        class="send-btn"
      >
        <i class="el-icon-s-promotion"></i> 发送
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WorkflowChat',
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    prefix: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '输入消息...'
    },
    emptyText: {
      type: String,
      default: '开始对话吧'
    },
    currentProject: {
      type: String,
      default: ''
    },
    sessionType: {
      type: String,
      default: 'design'
    }
  },
  data() {
    return {
      inputMessage: ''
    }
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Enter') {
        if (e.ctrlKey) {
          e.preventDefault()
          this.sendMessage()
        }
      }
    },
    sendMessage() {
      const msg = this.inputMessage.trim()
      if (!msg) return
      this.$emit('send', {
        message: msg,
        prefix: this.prefix,
        sessionType: this.sessionType
      })
      this.inputMessage = ''
    },
    formatTime(timestamp) {
      const d = new Date(timestamp)
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    },
    setInput(value) {
      this.inputMessage = value
    }
  },
  watch: {
    messages() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    }
  }
}
</script>

<style scoped>
.workflow-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0a09;
}

.prefix-hint {
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #409EFF;
  margin: 12px 16px 0;
}

.prefix-hint code {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #84848a;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

.chat-message {
  margin-bottom: 16px;
}

.chat-message.user .chat-bubble {
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.3);
  color: #60a5fa;
  font-weight: bold;
  margin-left: 48px;
  padding: 12px 16px;
  border-radius: 12px;
}

.chat-message.ai .chat-bubble {
  background: #18191b;
  border: 1px solid #1e1e1e;
  color: #d4d4d8;
  margin-right: 48px;
  padding: 12px 16px;
  border-radius: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-meta {
  font-size: 11px;
  color: #84848a;
  margin-top: 4px;
  padding: 0 4px;
}

.chat-message.user .chat-meta {
  text-align: right;
}

.chat-input-area {
  border-top: 1px solid #1e1e1e;
  padding: 12px 16px;
  background: #121212;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.send-btn {
  height: auto;
}
</style>
