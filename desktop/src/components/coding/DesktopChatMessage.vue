<template>
  <div class="chat-msg" :class="{ user: isUser }">
    <div class="chat-msg-avatar" :class="{ user: isUser, ai: !isUser }">
      {{ isUser ? 'U' : 'AI' }}
    </div>
    <div class="chat-msg-content">
      <div class="chat-msg-header">{{ header }}</div>
      <div class="chat-msg-text" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopChatMessage',
  props: {
    content: { type: String, default: '' },
    isUser: { type: Boolean, default: false },
    agentName: { type: String, default: 'AI' },
    time: { type: String, default: '刚刚' }
  },
  computed: {
    header() {
      return this.isUser ? `我 · ${this.time}` : `${this.agentName} · ${this.time}`
    },
    renderedContent() {
      return this.content
    }
  }
}
</script>

<style scoped>
.chat-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  max-width: 82%;
  animation: fadeInUp 0.25s ease-out;
}
.chat-msg.user {
  margin-left: auto;
  flex-direction: row-reverse;
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
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.chat-msg-avatar.user {
  background: linear-gradient(135deg, #4f6ef7, #6366f1);
  color: #fff;
}
.chat-msg-avatar.ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff;
}
.chat-msg-content {
  flex: 1;
  min-width: 0;
}
.chat-msg-header {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 3px;
}
.chat-msg.user .chat-msg-header {
  text-align: right;
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
.chat-msg.user .chat-msg-text {
  background: #eef1ff;
  border-radius: 10px 2px 10px 10px;
  border-color: #d8dcf8;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
