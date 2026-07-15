<template>
  <div class="assistant-panel" :style="{ width: panelWidth + 'px', minWidth: '260px' }">
    <div class="assistant-tabs">
      <button
        class="assistant-tab"
        :class="{ active: activeTab === 'design' }"
        @click="activeTab = 'design'"
      >AI方案助手</button>
      <button
        class="assistant-tab"
        :class="{ active: activeTab === 'discuss' }"
        @click="activeTab = 'discuss'"
      >探讨</button>
    </div>
    <div v-show="activeTab === 'design'" class="tab-panel">
      <div class="assistant-chat-messages" ref="designMessages">
        <div v-if="designMessages.length === 0" class="assistant-empty">
          <p>输入需求描述，AI 将协助您完善方案。</p>
        </div>
        <div v-for="(msg, idx) in designMessages" :key="idx" class="assistant-msg" :class="msg.role">
          <div class="amsg-text" v-html="msg.content"></div>
        </div>
      </div>
      <div class="assistant-input-area">
        <div class="assistant-input-wrap">
          <textarea
            v-model="designInput"
            placeholder="输入需求描述... (Enter 发送)"
            rows="1"
            @keydown="handleAssistKeydown($event, 'design')"
          ></textarea>
          <button class="assistant-send-btn" @click="sendAssistMessage('design')">↑</button>
        </div>
      </div>
      <div class="assistant-status-bar">
        <span>✓ 就绪</span>
        <span class="sep">|</span>
          <span>模型: {{ currentModel }}</span>
      </div>
    </div>
    <div v-show="activeTab === 'discuss'" class="tab-panel">
      <div class="discuss-section">
        <div class="discuss-list">
          <div
            v-for="(d, idx) in discussList"
            :key="d.id"
            class="discuss-item"
            :class="{ active: currentDiscussId === d.id }"
            @click="switchDiscuss(d)"
          >
            <span class="discuss-item-title">{{ d.title }}</span>
            <button class="discuss-item-del" @click.stop="deleteDiscuss(idx)" title="删除">&times;</button>
          </div>
        </div>
        <button class="discuss-new-btn" @click="createDiscuss">+ 新建探讨</button>
        <div class="assistant-chat-messages" ref="discussMessages" style="flex:1;">
          <div v-if="discussMessages.length === 0" class="assistant-empty">
            <p>选择一个探讨或创建新的探讨会话。</p>
          </div>
          <div v-for="(msg, idx) in discussMessages" :key="idx" class="assistant-msg" :class="msg.role">
            <div class="amsg-text" v-html="msg.content"></div>
          </div>
        </div>
        <div class="assistant-input-area">
          <div class="assistant-input-wrap">
            <textarea
              v-model="discussInput"
              placeholder="输入探讨内容... (Enter 发送)"
              rows="1"
              @keydown="handleAssistKeydown($event, 'discuss')"
            ></textarea>
            <button class="assistant-send-btn" @click="sendAssistMessage('discuss')">↑</button>
          </div>
        </div>
        <div class="assistant-status-bar">
          <span>✓ 就绪</span>
          <span class="sep">|</span>
          <span>会话: {{ currentDiscussTitle }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopAssistantPanel',
  props: {
    panelWidth: { type: Number, default: 370 },
    currentModel: { type: String, default: 'DeepSeek V3' }
  },
  data() {
    return {
      activeTab: 'design',
      designInput: '',
      discussInput: '',
      designMessages: [],
      discussMessages: [],
      discussList: [
        { id: 'd1', title: '方案架构探讨' },
        { id: 'd2', title: '技术选型分析' }
      ],
      currentDiscussId: 'd1'
    }
  },
  computed: {
    currentDiscussTitle() {
      const d = this.discussList.find(d => d.id === this.currentDiscussId)
      return d ? d.title : '未选择'
    }
  },
  methods: {
    handleAssistKeydown(e, type) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendAssistMessage(type)
      }
    },
    sendAssistMessage(type) {
      const inputVal = type === 'design' ? this.designInput : this.discussInput
      const val = inputVal.trim()
      if (!val) return
      const messages = type === 'design' ? this.designMessages : this.discussMessages
      messages.push({ role: 'user', content: this.escapeHtml(val) })
      if (type === 'design') this.designInput = ''
      else this.discussInput = ''
      this.$nextTick(() => this.scrollMessages(type))
      setTimeout(() => {
        const r = type === 'design'
          ? '好的，我来协助完善方案。<br><br>建议在架构设计部分增加：<br><br>• <strong>数据流设计</strong>：明确各层之间的数据传递方式<br>• <strong>错误处理策略</strong>：统一错误码与异常处理机制<br>• <strong>性能优化</strong>：缓存策略与懒加载方案'
          : '关于这个问题，我的看法：<br><br>从架构角度来看，当前设计是合理的。可以考虑引入中间层解耦，添加更多单元测试覆盖。'
        messages.push({ role: 'ai', content: r })
        this.$nextTick(() => this.scrollMessages(type))
      }, 800)
    },
    switchDiscuss(d) {
      this.currentDiscussId = d.id
      this.discussMessages = [{ role: 'ai', content: '已切换到：' + d.title }]
    },
    createDiscuss() {
      const count = this.discussList.length + 1
      const d = { id: 'd' + Date.now(), title: '探讨' + count }
      this.discussList.push(d)
      this.switchDiscuss(d)
    },
    deleteDiscuss(idx) {
      const item = this.discussList[idx]
      const wasActive = this.currentDiscussId === item.id
      this.discussList.splice(idx, 1)
      if (wasActive && this.discussList.length > 0) {
        this.switchDiscuss(this.discussList[0])
      } else if (this.discussList.length === 0) {
        this.currentDiscussId = null
        this.discussMessages = []
      }
    },
    escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },
    scrollMessages(type) {
      const ref = type === 'design' ? 'designMessages' : 'discussMessages'
      const el = this.$refs[ref]
      if (el) el.scrollTop = el.scrollHeight
    }
  }
}
</script>

<style scoped>
.assistant-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}
.assistant-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg-titlebar);
}
.assistant-tab {
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  font-family: inherit;
}
.assistant-tab:hover { color: var(--text-primary); }
.assistant-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.assistant-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
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
.assistant-msg { margin-bottom: 12px; font-size: 12.5px; line-height: 1.6; }
.assistant-msg.user { text-align: right; }
.assistant-msg.user .amsg-text {
  display: inline-block;
  background: var(--accent-light);
  color: var(--accent);
  padding: 6px 12px;
  border-radius: 10px 2px 10px 10px;
  max-width: 85%;
  text-align: left;
}
.assistant-msg.ai .amsg-text {
  display: inline-block;
  background: var(--bg-input);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 2px 10px 10px 10px;
  max-width: 85%;
}
.assistant-input-area {
  border-top: 1px solid var(--border);
  padding: 8px 10px;
  background: #fff;
}
.assistant-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 5px 6px 5px 10px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
}
.assistant-input-wrap:focus-within {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79,110,247,0.06);
}
.assistant-input-wrap textarea {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
  font-family: inherit;
  resize: none;
  min-height: 20px;
  max-height: 80px;
}
.assistant-input-wrap textarea::placeholder { color: var(--text-muted); }
.assistant-send-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.assistant-send-btn:hover { filter: brightness(1.08); }
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

.discuss-section { display: flex; flex-direction: column; height: 100%; }
.discuss-list {
  padding: 6px;
  border-bottom: 1px solid var(--border);
  max-height: 120px;
  overflow-y: auto;
}
.discuss-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.1s;
}
.discuss-item:hover { background: var(--bg-hover); }
.discuss-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.discuss-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.discuss-item-del {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  font-size: 14px;
  display: none;
  align-items: center;
  justify-content: center;
}
.discuss-item:hover .discuss-item-del { display: flex; }
.discuss-item-del:hover { color: var(--red); }
.discuss-new-btn {
  width: 100%;
  padding: 5px;
  margin: 2px 0;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  transition: all 0.15s;
  font-family: inherit;
}
.discuss-new-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
</style>
