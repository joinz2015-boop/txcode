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

    <div v-else-if="item.type === 'step'">
      <div v-if="item.thought" class="ai-thought" v-html="renderContent(item.thought)"></div>
      <div v-for="(tc, idx) in (item.toolCalls || [])" :key="idx" class="log-mute">
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
        if (action === 'bash' || action === 'execute_bash') {
          return parsed.command + (parsed.workdir ? ' (' + parsed.workdir + ')' : '')
        }
        if (action === 'read_file') {
          return parsed.file_path + (parsed.offset ? ':' + parsed.offset : '')
        }
        if (action === 'edit_file' || action === 'write_file') {
          return parsed.file_path || ''
        }
        if (action === 'glob' || action === 'find_files') {
          return parsed.pattern + (parsed.directory ? ' (' + parsed.directory + ')' : '')
        }
        if (action === 'grep' || action === 'search_content') {
          return '"' + parsed.pattern + '" (' + (parsed.directory || '') + ')'
        }
        return input
      } catch {
        return input
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

.ai-thought {
  color: var(--text-primary);
  margin-bottom: 10px;
  line-height: 1.6;
  font-size: 12.5px;
}
.ai-thought :deep(p) { margin: 4px 0; }
.log-mute {
  color: var(--text-muted);
  padding: 2px 0;
  font-size: 12px;
}
.tool-success { color: #22c55e; font-weight: 600; }
.tool-fail { color: #ef4444; font-weight: 600; }
.tool-input { color: var(--accent); margin-left: 6px; font-size: 11.5px; }

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

@keyframes spin {
  to { transform: rotate(360deg); }
}
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
</style>
