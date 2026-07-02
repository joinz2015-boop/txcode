<template>
  <div class="chat-panel" :class="{ 'hidden-panel': !visible }">
    <div class="panel-header">
      <span># {{ sessionName }}</span>
    </div>

    <ChatMessageList
      ref="messageList"
      :items="panel.logItems"
      :model-name="panel.modelName"
      @preview-image="$emit('preview-image', $event)"
    />

    <ChatInputArea
      :panel="panel"
      :placeholder="placeholder"
      :custom-actions="customActions"
      :plan-file-path="planFilePath"
      :status-actions="statusActions"
      :session-id="panel.sessionId"
      @send="$emit('send')"
      @stop="$emit('stop')"
      @paste-image="$emit('paste-image', $event)"
      @files-selected="$emit('files-selected', $event)"
      @remove-media="$emit('remove-media', $event)"
      @action="$emit('custom-action', $event)"
      @fill-dev-plan="$emit('fill-dev-plan')"
      @open-model="$emit('open-model')"
      @status-action="$emit('status-action', $event)"
      @open-test="$emit('open-test')"
    />

    <ChatStatusBar
      v-if="!hideStatusBar"
      :session-id="panel.sessionId"
      :model-name="panel.modelName"
      :prompt-tokens="panel.promptTokens"
      :disabled="panel.disabled"
      :actions="statusActions"
      @action="$emit('status-action', $event)"
    />
  </div>
</template>

<script>
import ChatMessageList from './ChatMessageList.vue'
import ChatInputArea from './ChatInputArea.vue'
import ChatStatusBar from './ChatStatusBar.vue'

export default {
  name: 'ChatPanel',
  components: { ChatMessageList, ChatInputArea, ChatStatusBar },
  props: {
    visible: { type: Boolean, default: true },
    panel: { type: Object, required: true },
    sessionName: { type: String, default: '' },
    planFilePath: { type: String, default: '' },
    placeholder: { type: String, default: '输入消息... (Enter 发送, Ctrl+Enter 换行, @ 选择文件)' },
    customActions: { type: Array, default: () => [] },
    statusActions: { type: Array, default: () => [] },
    hideStatusBar: { type: Boolean, default: false },
  },
  methods: {
    scrollToBottom(force = false) {
      const ml = this.$refs.messageList
      if (ml) ml.scrollToBottom(force)
    },
  },
}
</script>

<style scoped>
.chat-panel { flex: 1; display: flex; flex-direction: column; background: var(--color-panelHeader); border: 1px solid var(--color-contentBg); border-radius: 8px; min-width: 0; overflow: hidden; }
.chat-panel.hidden-panel { display: none; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--color-contentBg); font-size: 13px; font-weight: 600; color: var(--color-textMain); flex-shrink: 0; }

</style>
