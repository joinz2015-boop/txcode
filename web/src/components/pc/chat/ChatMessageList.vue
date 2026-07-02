<template>
  <div class="chat-messages" ref="messageContainer">
    <div v-if="!items || items.length === 0" class="chat-empty">
      <span class="chat-empty-icon">{{ emptyIcon }}</span>
      <p>{{ emptyText }}</p>
    </div>
    <template v-for="(item, idx) in items">
      <div v-if="item.type === 'todos'" :key="'ml-' + idx" class="todos-list">
        <div v-for="(todo, tIdx) in item.todos" :key="tIdx" class="todo-item">
          <span class="todo-status">{{ getTodoStatusIcon(todo.status) }}</span>
          <span class="todo-name">{{ todo.name }}</span>
        </div>
      </div>
      <div v-else-if="item.type === 'chat'" :key="'ml-' + idx" class="flex justify-end">
        <div class="user-question">
          <div v-if="item.mediaFiles && item.mediaFiles.length" class="chat-images">
            <img v-for="mf in item.mediaFiles" :key="mf.filePath" :src="mf.url || mf.dataUrl || mf.filePath" class="chat-image-thumb" @click.stop="$emit('preview-image', mf)" />
          </div>
          <div>{{ item.content }}</div>
        </div>
      </div>
      <div v-else-if="item.type === 'think'" :key="'ml-' + idx" class="ai-thought" v-html="renderMarkdown(item.content)"></div>
      <template v-else-if="item.type === 'step'" :key="'ml-' + idx">
        <div v-if="item.thought" class="ai-thought" v-html="renderMarkdown(item.thought)"></div>
        <div v-for="(tc, aIdx) in item.toolCalls" :key="aIdx" class="log-mute">
          <span :class="item.success !== false ? 'tool-success' : 'tool-fail'">{{ item.success !== false ? '✓' : '✗' }}</span>
          {{ getToolCallName(tc) }}
          <span v-if="getToolCallArguments(tc)" class="tool-input">{{ formatInput(getToolCallName(tc), getToolCallArguments(tc)) }}</span>
        </div>
      </template>
      <div v-else-if="item.type === 'system'" :key="'ml-' + idx" class="system-msg">{{ item.content }}</div>
    </template>
    <div class="build-info" v-if="modelName">
      <span class="icon">▣</span> Build · {{ modelName }}
    </div>
  </div>
</template>

<script>
import { getTodoStatusIcon, getToolCallName, getToolCallArguments, formatInput, renderMarkdown } from '../../../lib/render.js'
import { scrollToBottom, snapshotScroll } from '../../../utils/scroll'

export default {
  name: 'ChatMessageList',
  props: {
    items: { type: Array, default: () => [] },
    modelName: { type: String, default: '' },
    emptyIcon: { type: String, default: '💬' },
    emptyText: { type: String, default: '开始对话吧！输入您的问题...' },
  },
  methods: {
    getTodoStatusIcon,
    getToolCallName,
    getToolCallArguments,
    formatInput,
    renderMarkdown,
    scrollToBottom(force = false) {
      const snap = snapshotScroll(this.$refs.messageContainer)
      this.$nextTick(() => {
        const el = this.$refs.messageContainer
        if (el) scrollToBottom(el, { force, prevSnapshot: snap })
      })
    },
  },
}
</script>

<style scoped>
.chat-messages { flex: 1; overflow-y: auto; padding: 16px 40px 24px; font-size: 14px; line-height: 1.6; }
.chat-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-textMuted); flex-direction: column; gap: 12px; }
.chat-empty-icon { font-size: 48px; opacity: 0.3; }

.user-question { color: var(--color-accent); font-weight: 600; border: 1px solid var(--color-accent); padding: 12px 16px; margin: 12px 0 12px auto; border-radius: 10px; display: inline-block; max-width: 70%; word-break: break-word; }
.ai-thought { color: var(--color-textMain); margin-bottom: 16px; line-height: 1.6; }
.log-mute { color: var(--color-textMuted); margin-bottom: 12px; font-size: 13px; }
.tool-success { color: var(--color-success, #22c55e); }
.tool-fail { color: var(--color-danger, #ef4444); }
.tool-input { color: var(--color-accent); margin-left: 6px; }
.build-info { color: var(--color-textMuted); display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; }
.build-info .icon { color: var(--color-accent); font-size: 11px; }
.todos-list { margin-bottom: 16px; color: var(--color-textMain); }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 13px; }
.system-msg { color: var(--color-textMuted); margin-bottom: 12px; font-size: 13px; font-style: italic; }

.chat-images { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.chat-image-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; }
</style>
