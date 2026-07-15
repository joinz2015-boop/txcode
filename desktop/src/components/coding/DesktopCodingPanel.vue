<template>
  <div class="coding-panel">
    <div class="panel-header">
      <span class="panel-header-title"># {{ sessionTitle }}</span>
      <span class="content-header-badge">{{ currentAgent }}</span>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="welcome">
        <div class="welcome-logo">T</div>
        <h2 class="welcome-title">欢迎使用 txcode</h2>
        <p class="welcome-desc">AI 编码助手 · 选择左侧会话开始</p>
      </div>
      <DesktopChatMessage
        v-for="(msg, idx) in messages"
        :key="idx"
        :content="msg.content"
        :isUser="msg.role === 'user'"
        :agentName="msg.agentName || 'Code Agent'"
        :time="msg.time || '刚刚'"
      />
      <div v-if="sending" class="chat-msg">
        <div class="chat-msg-avatar ai">AI</div>
        <div class="chat-msg-content">
          <div class="chat-msg-header">{{ currentAgent }} · 正在输入...</div>
          <div class="chat-msg-text">
            <span class="typing-dot">●</span>
            <span class="typing-dot">●</span>
            <span class="typing-dot">●</span>
          </div>
        </div>
      </div>
    </div>
    <div class="code-input-block">
      <div class="code-input-wrapper">
        <textarea
          class="code-textarea"
          v-model="inputText"
          placeholder="输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)"
          rows="3"
          @keydown="handleKeydown"
        ></textarea>
        <div class="code-input-actions">
          <div class="code-input-actions-left">
            <span class="input-status" :style="{ color: sending ? '#f59e0b' : '#22c55e' }">
              {{ sending ? '● 处理中' : '✓ 就绪' }}
            </span>
            <span class="input-sep">|</span>
            <span class="input-action" @click="cycleAgent">模型: {{ currentModel }} ▾</span>
            <span class="input-sep">|</span>
            <span>会话: {{ sessionIdDisplay }}</span>
            <span class="input-sep">|</span>
            <span>token: {{ tokenCount }}</span>
            <span class="input-sep">|</span>
            <span class="input-action">选择文件</span>
            <span class="input-sep">|</span>
            <span class="input-action">选择Skill</span>
            <span class="input-sep">|</span>
            <span class="input-action">选择设计</span>
            <span class="input-sep">|</span>
            <span class="input-action">命令</span>
            <span class="input-sep">|</span>
            <span class="input-action">测试</span>
            <span class="input-sep">|</span>
            <span class="input-action">git变更</span>
          </div>
          <div class="code-input-actions-right">
            <button class="input-btn btn-upload">图片</button>
            <button v-if="sending" class="input-btn btn-stop" @click="stopSending">■ 停止</button>
            <button class="input-btn btn-send-code" @click="sendMessage">发送</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopChatMessage from './DesktopChatMessage.vue'
import { getItem, setItem } from '@/utils/storage'

const demoAgents = ['Code Agent', 'Chat Agent', 'Plan Agent', 'Design Agent', 'Task Agent', 'Summarizer']
const demoModels = ['DeepSeek V3', 'GPT-4o', 'Claude 3.5', 'Gemini Pro', 'Qwen Max', 'Llama 3']

export default {
  name: 'DesktopCodingPanel',
  components: { DesktopChatMessage },
  props: {
    currentAgent: { type: String, default: 'Code Agent' },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null }
  },
  data() {
    return {
      inputText: '',
      messages: [],
      sending: false,
      agentIdx: 0,
      tokenCount: 0
    }
  },
  computed: {
    sessionTitle() {
      return this.currentSession ? this.currentSession.name : 'AI 编码对话'
    },
    sessionIdDisplay() {
      return this.currentSession ? 'sess_' + (this.currentSession.id || 'new') : '未创建'
    }
  },
  watch: {
    currentSession(val) {
      if (val) {
        this.messages = []
        this.tokenCount = 0
      }
    }
  },
  methods: {
    open(data) {
      if (data && data.sessionId) {
        this.messages = []
        this.tokenCount = 0
      }
    },
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },
    sendMessage() {
      const val = this.inputText.trim()
      if (!val) return
      this.messages.push({ role: 'user', content: val, time: '刚刚' })
      this.tokenCount += Math.floor(val.length * 1.5)
      this.inputText = ''
      this.sending = true
      this.$nextTick(() => this.scrollToBottom())
      setTimeout(() => {
        const responses = [
          '好的，我来处理。已分析你的需求，我会按照最佳实践实现。需要进一步细化方案吗？',
          '收到。建议方案：\n\n1. 分析现有代码结构\n2. 设计接口和数据模型\n3. 逐步实现\n\n要开始吗？',
          '理解了。参考实现已准备好，根据实际场景调整即可。'
        ]
        this.messages.push({
          role: 'ai',
          content: responses[Math.floor(Math.random() * responses.length)],
          agentName: this.currentAgent,
          time: '刚刚'
        })
        this.sending = false
        this.$nextTick(() => this.scrollToBottom())
      }, 1500 + Math.random() * 800)
    },
    stopSending() {
      this.sending = false
    },
    cycleAgent() {
      this.agentIdx = (this.agentIdx + 1) % demoAgents.length
      this.$emit('update:agent', demoAgents[this.agentIdx])
      this.$emit('update:model', demoModels[this.agentIdx])
    },
    scrollToBottom() {
      const el = this.$refs.messagesContainer
      if (el) el.scrollTop = el.scrollHeight
    }
  }
}
</script>

<style scoped>
.coding-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  background: var(--bg-chat);
}
.panel-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.content-header-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.welcome {
  text-align: center;
  padding: 32px 0 20px;
}
.welcome-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 16px rgba(79,110,247,0.25);
}
.welcome-title {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.welcome-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-muted);
}
.code-input-block {
  background: var(--bg-input);
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.code-input-wrapper {
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.code-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  line-height: 1.5;
  background: transparent;
  min-height: 60px;
}
.code-textarea::placeholder {
  color: var(--text-muted);
}
.code-input-actions {
  display: flex;
  gap: 0;
  flex-wrap: wrap;
  align-items: center;
  font-size: 11.5px;
  color: var(--text-muted);
  padding: 5px 10px;
  border-top: 1px solid var(--border);
  justify-content: space-between;
}
.code-input-actions-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.code-input-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.input-status { font-weight: 500; }
.input-sep { color: var(--border); user-select: none; }
.input-action { cursor: pointer; transition: color 0.15s; }
.input-action:hover { color: var(--accent); }
.input-btn {
  font-size: 11.5px;
  padding: 4px 11px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-upload {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
}
.btn-upload:hover { border-color: var(--accent); color: var(--accent); }
.btn-stop { background: #ef4444; color: #fff; }
.btn-stop:hover { background: #dc2626; }
.btn-send-code { background: var(--accent); color: #fff; }
.btn-send-code:hover { background: #6366f1; }

.chat-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.chat-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.chat-msg-avatar.ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff;
}
.chat-msg-content { flex: 1; min-width: 0; }
.chat-msg-header {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 3px;
}
.chat-msg-text {
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.65;
  background: #f8f9fb;
  padding: 10px 14px;
  border-radius: 2px 10px 10px 10px;
  border: 1px solid var(--border);
}
@keyframes typing {
  0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; }
}
.typing-dot { animation: typing 1.4s ease-in-out infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
</style>
