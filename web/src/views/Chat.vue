<template>
  <div class="chat-container">
    <!-- 消息列表 -->
    <div class="message-list" ref="messageList">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="msg.role"
      >
        <div class="message-avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content">
          <div class="message-role">{{ getRoleLabel(msg.role) }}</div>
          <div class="message-text" v-html="formatContent(msg.content)"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">开始对话吧！输入您的问题...</div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input">
      <el-input
        v-model="input"
        type="textarea"
        :rows="3"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        @keydown.enter.native="handleKeydown"
        :disabled="disabled"
      />
      <el-button
        type="primary"
        :loading="disabled"
        @click="send"
        class="send-btn"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script>
/**
 * Chat 组件
 * 
 * 聊天界面，包含：
 * - 消息列表展示
 * - 用户输入区域
 * - 发送消息功能
 */
export default {
  name: 'Chat',

  props: {
    // 当前会话
    session: {
      type: Object,
      default: null,
    },
    // 消息列表
    messages: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      input: '',
      disabled: false,
    };
  },

  watch: {
    // 消息变化时滚动到底部
    messages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },
      deep: true,
    },
  },

  methods: {
    /**
     * 获取角色标签
     */
    getRoleLabel(role) {
      const labels = {
        user: '你',
        assistant: 'AI',
        system: '系统',
        tool: '工具',
      };
      return labels[role] || role;
    },

    /**
     * 格式化消息内容
     * - 支持 Markdown 代码块
     * - 支持换行
     */
    formatContent(content) {
      if (!content) return '';

      // 转义 HTML
      let text = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // 代码块
      text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

      // 行内代码
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

      // 换行
      text = text.replace(/\n/g, '<br>');

      return text;
    },

    /**
     * 键盘事件处理
     */
    handleKeydown(e) {
      // Shift+Enter 换行
      if (e.shiftKey) {
        return;
      }
      // Enter 发送
      e.preventDefault();
      this.send();
    },

    /**
     * 发送消息
     */
    send() {
      const content = this.input.trim();
      if (!content || this.disabled) return;

      this.input = '';
      this.disabled = true;
      this.$emit('send-message', content);

      // 延迟解锁，等待 AI 回复
      setTimeout(() => {
        this.disabled = false;
      }, 500);
    },

    /**
     * 滚动到底部
     */
    scrollToBottom() {
      const list = this.$refs.messageList;
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    },
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message-content {
  margin-left: 12px;
  flex: 1;
  min-width: 0;
}

.message-role {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-text >>> code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.message-text >>> pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-text >>> pre code {
  background: none;
  padding: 0;
}

.message-item.user .message-text {
  background: #e6f7ff;
  padding: 10px 15px;
  border-radius: 8px;
}

.message-item.assistant .message-text {
  background: #f5f5f5;
  padding: 10px 15px;
  border-radius: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

.chat-input {
  padding: 15px 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.chat-input >>> .el-textarea {
  flex: 1;
}

.send-btn {
  height: 76px;
}
</style>
