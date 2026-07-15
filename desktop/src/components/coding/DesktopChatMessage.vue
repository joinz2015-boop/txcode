<template>
  <div>
    <div v-if="item.type === 'chat'" class="chat-msg" :class="{ user: item.role === 'user' }">
      <div class="chat-msg-avatar" :class="{ user: item.role === 'user', ai: item.role !== 'user' }">
        {{ item.role === 'user' ? 'U' : 'AI' }}
      </div>
      <div class="chat-msg-content">
        <div class="chat-msg-header">{{ item.role === 'user' ? '我' : 'AI' }} · 刚刚</div>
        <div class="chat-msg-text" v-html="renderContent(item.content)"></div>
      </div>
    </div>

    <div v-else-if="item.type === 'think'" class="chat-msg">
      <div class="chat-msg-avatar ai">AI</div>
      <div class="chat-msg-content">
        <div class="chat-msg-header">AI · 回复</div>
        <div class="chat-msg-text" v-html="renderContent(item.content)"></div>
      </div>
    </div>

    <div v-else-if="item.type === 'step'" class="step-msg">
      <div class="step-header">
        <span class="step-label">🔧 工具调用</span>
        <span v-if="item.iteration" class="step-iter">#{{ item.iteration }}</span>
      </div>
      <div v-if="item.thought" class="step-thought" v-html="renderContent(item.thought)"></div>
      <div v-if="item.toolCalls" class="step-tools">
        <div v-for="(tc, idx) in item.toolCalls" :key="idx" class="step-tool-item" :class="{ executing: tc.status === 'executing', error: tc.status === 'error' }">
          <span class="tool-status">{{ tc.status === 'executing' ? '⏳' : tc.status === 'error' ? '✗' : '✓' }}</span>
          <span class="tool-name">{{ tc.function ? tc.function.name : (tc.name || 'unknown') }}</span>
          <span v-if="tc.function && tc.function.arguments" class="tool-args">{{ formatArgs(tc.function.arguments) }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="item.type === 'todos'" class="todos-msg">
      <div class="todos-header">📋 任务列表</div>
      <div v-for="(todo, idx) in (item.todos || [])" :key="idx" class="todo-item">
        <span class="todo-status">{{ todo.completed ? '✓' : '○' }}</span>
        <span class="todo-text" :class="{ completed: todo.completed }">{{ todo.text || todo.name || todo }}</span>
      </div>
    </div>

    <div v-else-if="item.type === 'compact'" class="compact-msg">
      <div class="compact-text">🔄 对话已压缩，消息历史已刷新</div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'

export default {
  name: 'DesktopChatMessage',
  props: {
    item: { type: Object, default: () => ({}) }
  },
  methods: {
    renderContent(text) {
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
    formatArgs(argsStr) {
      if (!argsStr) return ''
      try {
        const parsed = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr
        const keys = Object.keys(parsed)
        if (keys.length === 0) return ''
        const summary = keys.slice(0, 3).map(k => {
          let v = parsed[k]
          if (typeof v === 'string' && v.length > 60) v = v.substring(0, 60) + '...'
          return k + ': ' + v
        }).join(', ')
        return summary + (keys.length > 3 ? '...' : '')
      } catch {
        const s = String(argsStr)
        return s.length > 80 ? s.substring(0, 80) + '...' : s
      }
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
  word-break: break-word;
}
.chat-msg.user .chat-msg-text {
  background: #eef1ff;
  border-radius: 10px 2px 10px 10px;
  border-color: #d8dcf8;
}
.chat-msg-text :deep(p) { margin: 4px 0; }
.chat-msg-text :deep(pre) {
  background: #f1f2f6;
  border-radius: 4px;
  padding: 8px 12px;
  overflow-x: auto;
  font-size: 12px;
  margin: 6px 0;
}
.chat-msg-text :deep(code) {
  background: #f1f2f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.step-msg {
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f9fafb;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12.5px;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.step-label {
  font-weight: 600;
  color: var(--text-primary);
}
.step-iter {
  font-size: 10px;
  color: var(--text-muted);
  background: #e5e5ea;
  padding: 1px 6px;
  border-radius: 8px;
}
.step-thought {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.5;
}
.step-thought :deep(p) { margin: 3px 0; }
.step-tools {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.step-tool-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 11.5px;
  border: 1px solid #e5e5ea;
}
.step-tool-item.executing {
  background: #fefce8;
  border-color: #fde68a;
}
.step-tool-item.error {
  background: #fef2f2;
  border-color: #fecaca;
}
.tool-status { font-size: 11px; flex-shrink: 0; }
.tool-name {
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}
.tool-args {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.todos-msg {
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f9fafb;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12.5px;
}
.todos-header {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}
.todo-status { flex-shrink: 0; font-size: 12px; }
.todo-text { color: var(--text-secondary); }
.todo-text.completed { text-decoration: line-through; color: var(--text-muted); }

.compact-msg {
  margin-bottom: 16px;
  text-align: center;
}
.compact-text {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
