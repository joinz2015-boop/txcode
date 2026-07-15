<template>
  <div class="design-view">
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <div class="panel-tabs">
        <div class="panel-tab" :class="{ active: designTab === 'pages' }" @click="setDesignTab('pages')">
          <span>📄</span> 设计页面
        </div>
        <div class="panel-tab" :class="{ active: designTab === 'ai' }" @click="setDesignTab('ai')">
          <span>🤖</span> AI设计助手
        </div>
      </div>

      <div class="tree-container" v-show="designTab === 'pages'">
        <div class="tree-folder" :class="{ open: openFolders.desktop }">
          <div class="tree-folder-header" @click="toggleFolder('desktop')">
            <span class="tree-folder-arrow">▶</span>
            <span class="tree-folder-icon">📁</span>
            <span class="tree-folder-name">desktop</span>
            <span class="tree-folder-count">5</span>
          </div>
          <div class="tree-folder-children">
            <div
              class="tree-file"
              :class="{ active: selectedDesignFile === 'main_web.html' }"
              @click="selectDesignFile('main_web.html')"
            >
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">main_web.html</span>
            </div>
            <div
              class="tree-file"
              :class="{ active: selectedDesignFile === 'design.html' }"
              @click="selectDesignFile('design.html')"
            >
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">design.html</span>
            </div>
            <div
              class="tree-file"
              :class="{ active: selectedDesignFile === 'settings.html' }"
              @click="selectDesignFile('settings.html')"
            >
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">settings.html</span>
            </div>
          </div>
        </div>
        <div class="tree-folder" :class="{ open: openFolders.mobile }">
          <div class="tree-folder-header" @click="toggleFolder('mobile')">
            <span class="tree-folder-arrow">▶</span>
            <span class="tree-folder-icon">📁</span>
            <span class="tree-folder-name">mobile</span>
            <span class="tree-folder-count">2</span>
          </div>
          <div class="tree-folder-children">
            <div class="tree-file" :class="{ active: selectedDesignFile === 'app_home.html' }" @click="selectDesignFile('app_home.html')">
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">app_home.html</span>
            </div>
            <div class="tree-file" :class="{ active: selectedDesignFile === 'app_chat.html' }" @click="selectDesignFile('app_chat.html')">
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">app_chat.html</span>
            </div>
          </div>
        </div>
        <div class="tree-folder" :class="{ open: openFolders.components }">
          <div class="tree-folder-header" @click="toggleFolder('components')">
            <span class="tree-folder-arrow">▶</span>
            <span class="tree-folder-icon">📁</span>
            <span class="tree-folder-name">components</span>
            <span class="tree-folder-count">1</span>
          </div>
          <div class="tree-folder-children">
            <div class="tree-file" :class="{ active: selectedDesignFile === 'button.html' }" @click="selectDesignFile('button.html')">
              <span class="tree-file-icon">📄</span>
              <span class="tree-file-name">button.html</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-chat-panel" v-show="designTab === 'ai'">
        <div class="chat-body" ref="designChatBody">
          <div class="chat-msg-wrap ai">
            <div class="chat-msg-avatar ai">🤖</div>
            <div class="chat-msg-bubble ai">你好！我是 AI 设计助手，可以帮你创建和修改 HTML 页面原型。</div>
          </div>
          <div class="chat-msg-wrap ai" v-if="designChatMessages.length === 0">
            <div class="chat-msg-avatar ai">🤖</div>
            <div class="chat-msg-bubble ai">你可以这样跟我说：<br><br>• 调整配色方案<br>• 添加响应式布局<br>• 优化按钮样式<br>• 生成一个登录页面<br><br>请在下方输入你的设计需求。</div>
          </div>
          <div v-for="(msg, idx) in designChatMessages" :key="idx" class="chat-msg-wrap" :class="msg.role">
            <div class="chat-msg-avatar" :class="msg.role">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
            <div class="chat-msg-bubble" :class="msg.role" v-html="msg.content"></div>
          </div>
        </div>
        <div class="chat-foot">
          <div class="chat-hints-row">
            <span class="chat-hint-chip" @click="sendDesignHint('调整当前页面配色方案')">调整配色方案</span>
            <span class="chat-hint-chip" @click="sendDesignHint('添加响应式布局')">响应式布局</span>
            <span class="chat-hint-chip" @click="sendDesignHint('优化按钮样式')">优化按钮</span>
            <span class="chat-hint-chip" @click="sendDesignHint('生成一个登录页面')">生成登录页</span>
          </div>
          <div class="chat-input-wrap">
            <textarea class="chat-textarea" v-model="designChatInput" placeholder="输入设计需求... (Enter 发送, Ctrl+Enter 换行)" @keydown="handleDesignKeydown"></textarea>
            <button class="chat-send" @click="sendDesignMessage" title="发送">▶</button>
          </div>
          <div class="chat-statusbar">
            <span :class="designLoading ? 'chat-status-thinking' : 'chat-status-ready'">
              <span v-if="designLoading" class="chat-spinner"></span>
              {{ designLoading ? ' 思考中' : '✓ 就绪' }}
            </span>
            <span class="sep">|</span>
            <span>模型：Design Agent</span>
          </div>
        </div>
      </div>
    </div>

    <div class="resize-handle" @mousedown="startResize" :class="{ active: resizing }"></div>

    <div class="preview-panel">
      <div class="preview-toolbar">
        <span class="preview-toolbar-label">视口：</span>
        <button class="device-btn" :class="{ active: currentDevice === 'web' }" @click="currentDevice = 'web'">🖥 Web</button>
        <button class="device-btn" :class="{ active: currentDevice === 'app' }" @click="currentDevice = 'app'">📱 App</button>
        <button class="device-btn" :class="{ active: currentDevice === 'pad' }" @click="currentDevice = 'pad'">🖥 Pad</button>
        <span class="preview-toolbar-spacer"></span>
        <button class="icon-btn" title="刷新预览" @click="refreshPreview">↻</button>
      </div>
      <div class="preview-body">
        <div class="preview-empty" v-if="!selectedDesignFile">
          <div class="preview-empty-icon">👁</div>
          <p class="preview-empty-text">双击左侧 HTML 文件预览</p>
        </div>
        <div class="device-frame" :class="currentDevice" v-else>
          <div class="device-frame-actions">
            <button class="device-action-btn" @click="refreshPreview">刷新</button>
          </div>
          <iframe class="preview-iframe" :src="previewSrc" ref="previewIframe"></iframe>
        </div>
      </div>
      <div class="preview-filebar">
        <span>{{ filebarPath }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { getItem, setItem } from '@/utils/storage'

export default {
  name: 'DesktopDesignView',
  data() {
    return {
      openFolders: { desktop: true, mobile: false, components: false },
      selectedDesignFile: 'main_web.html',
      currentDevice: 'web',
      leftPanelWidth: 280,
      resizing: false,
      designChatInput: '',
      designChatMessages: [],
      designLoading: false,
      designTab: getItem('design:tab', 'pages')
    }
  },
  computed: {
    previewSrc() {
      if (!this.selectedDesignFile) return ''
      return '../../.txcode/design/desktop/' + this.selectedDesignFile
    },
    filebarPath() {
      if (!this.selectedDesignFile) return '未打开文件'
      return '.txcode/design/desktop/' + this.selectedDesignFile
    }
  },
  methods: {
    open(data) {
      if (data && data.file) {
        this.selectedDesignFile = data.file
      }
    },
    setDesignTab(tab) {
      this.designTab = tab
      setItem('design:tab', tab)
    },
    toggleFolder(name) {
      this.$set(this.openFolders, name, !this.openFolders[name])
    },
    selectDesignFile(fileName) {
      this.selectedDesignFile = fileName
    },
    refreshPreview() {
      const iframe = this.$refs.previewIframe
      if (iframe) {
        iframe.src = iframe.src
      }
    },
    startResize(e) {
      this.resizing = true
      const startX = e.clientX
      const startW = this.leftPanelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        this.leftPanelWidth = Math.max(220, Math.min(500, startW + (ev.clientX - startX)))
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
    handleDesignKeydown(e) {
      if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault()
        this.sendDesignMessage()
      }
    },
    sendDesignMessage() {
      const msg = this.designChatInput.trim()
      if (!msg) return
      this.designChatMessages.push({ role: 'user', content: this.escapeHtml(msg) })
      this.designChatInput = ''
      this.designLoading = true
      this.$nextTick(() => { const el = this.$refs.designChatBody; if (el) el.scrollTop = el.scrollHeight })
      setTimeout(() => {
        this.designChatMessages.push({ role: 'ai', content: this.generateDesignResponse(msg) })
        this.designLoading = false
        this.$nextTick(() => { const el = this.$refs.designChatBody; if (el) el.scrollTop = el.scrollHeight })
      }, 800 + Math.random() * 600)
    },
    sendDesignHint(msg) {
      this.designChatInput = msg
      this.sendDesignMessage()
    },
    escapeHtml(str) {
      return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },
    generateDesignResponse(msg) {
      const lower = msg.toLowerCase()
      if (lower.includes('配色')) return '好的！建议使用现代化的配色方案：主色调使用 <code>#5865f2</code>（靛蓝），辅助色使用 <code>#7c5cf0</code>（紫色），背景使用白色系，边框使用 <code>#e5e5ea</code>。'
      if (lower.includes('响应式')) return '建议采用 Flexbox 布局，在移动端 max-width: 900px 时缩小侧栏，700px 时仅显示图标导航。预览区支持 Web / App / Pad 三种视口切换。'
      if (lower.includes('按钮')) return '按钮优化建议：<br><br>1. 使用圆角 border-radius: 8px<br>2. hover 态颜色加深<br>3. 按下时 transform: scale(0.95) 提供反馈感<br>4. 添加 transition: all 0.15s 过渡动画'
      if (lower.includes('登录')) return '我来设计一个登录页面原型：<br><br>- Logo 区域（居中）<br>- 邮箱输入框<br>- 密码输入框<br>- 登录按钮（主色）<br>- 忘记密码链接<br>- 第三方登录入口<br><br>需要卡片式还是全屏式布局？'
      return '收到你的需求。我正在分析并生成设计方案，请稍候。你可以在中间预览区查看效果，需要调整请随时告诉我。'
    }
  }
}
</script>

<style scoped>
.design-view { flex: 1; display: flex; overflow: hidden; }
.left-panel {
  width: 280px; min-width: 220px; max-width: 500px;
  background: var(--bg-side); display: flex; flex-direction: column;
  border-right: 1px solid var(--border); overflow: hidden;
}
.panel-tabs { display: flex; border-bottom: 1px solid var(--border); background: var(--bg-titlebar); flex-shrink: 0; }
.panel-tab {
  flex: 1; text-align: center; padding: 10px 8px; cursor: pointer;
  font-size: 12.5px; border-bottom: 2px solid transparent;
  transition: all 0.15s; color: var(--text-muted); user-select: none;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.panel-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.panel-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.tree-container { flex: 1; overflow-y: auto; padding: 6px 0; }
.tree-folder-header {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  cursor: pointer; font-size: 12.5px; color: var(--text-secondary);
  transition: background 0.1s; user-select: none;
}
.tree-folder-header:hover { background: var(--bg-hover); }
.tree-folder-arrow { width: 14px; font-size: 10px; color: var(--text-muted); transition: transform 0.15s; flex-shrink: 0; }
.tree-folder.open > .tree-folder-header > .tree-folder-arrow { transform: rotate(90deg); }
.tree-folder-icon { font-size: 13px; flex-shrink: 0; color: var(--yellow); }
.tree-folder-name { font-weight: 500; }
.tree-folder-count { font-size: 10px; color: var(--text-muted); margin-left: auto; }
.tree-folder-children { display: none; }
.tree-folder.open > .tree-folder-children { display: block; }
.tree-file {
  display: flex; align-items: center; gap: 6px; padding: 5px 14px 5px 38px;
  cursor: pointer; font-size: 12px; color: var(--text-secondary);
  transition: all 0.1s; user-select: none; border-left: 2px solid transparent;
}
.tree-file:hover { background: var(--bg-hover); color: var(--text-primary); }
.tree-file.active { background: var(--accent-light); color: var(--accent); border-left-color: var(--accent); font-weight: 500; }
.tree-file-icon { font-size: 12px; flex-shrink: 0; color: var(--accent); }
.tree-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-chat-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.chat-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.chat-msg-wrap { display: flex; gap: 6px; max-width: 100%; }
.chat-msg-wrap.user { justify-content: flex-end; }
.chat-msg-avatar { width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.chat-msg-avatar.ai { background: var(--accent-light); color: var(--accent); }
.chat-msg-avatar.user { background: #e5e5ea; color: #6e6e73; }
.chat-msg-bubble { padding: 7px 11px; border-radius: 8px; font-size: 12px; line-height: 1.55; max-width: 85%; }
.chat-msg-bubble.ai { background: #fff; color: var(--text-primary); border: 1px solid var(--border); border-top-left-radius: 2px; }
.chat-msg-bubble.user { background: var(--accent); color: #fff; border-top-right-radius: 2px; }
.chat-msg-bubble code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10.5px; color: #e74c3c; }
.chat-foot { border-top: 1px solid var(--border); flex-shrink: 0; }
.chat-input-wrap { display: flex; gap: 6px; padding: 8px 10px; }
.chat-textarea { flex: 1; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px; font-size: 12px; color: var(--text-primary); outline: none; resize: none; font-family: inherit; height: 34px; line-height: 1.4; }
.chat-textarea:focus { border-color: var(--accent); }
.chat-hints-row { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 10px 8px; }
.chat-hint-chip { font-size: 10px; padding: 2px 8px; border-radius: 10px; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.15s; }
.chat-hint-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.chat-send { width: 34px; height: 34px; border-radius: 8px; border: none; background: var(--accent); color: #fff; cursor: pointer; font-size: 14px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chat-send:hover { background: #4752c4; }
.chat-send:disabled { background: #c5c5d0; cursor: not-allowed; }
.chat-statusbar { display: flex; align-items: center; gap: 8px; padding: 4px 12px; font-size: 10.5px; color: var(--text-muted); border-top: 1px solid var(--border); flex-shrink: 0; background: var(--bg-titlebar); }
.chat-status-ready { color: var(--green); }
.chat-status-thinking { color: var(--accent); }
.chat-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.sep { color: var(--border); }

.resize-handle { width: 3px; min-width: 3px; background: var(--border); cursor: col-resize; transition: background 0.15s; flex-shrink: 0; }
.resize-handle:hover, .resize-handle.active { background: var(--accent); }
.preview-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-panel); min-width: 300px; }
.preview-toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-bottom: 1px solid var(--border); background: var(--bg-side); flex-shrink: 0; }
.preview-toolbar-label { font-size: 11px; color: var(--text-muted); }
.preview-toolbar-spacer { flex: 1; }
.device-btn { padding: 4px 12px; font-size: 11px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; background: transparent; color: var(--text-muted); transition: all 0.15s; }
.device-btn:hover { border-color: var(--border); color: var(--text-primary); }
.device-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.icon-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.preview-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 16px; background: #fafafa; background-image: radial-gradient(circle, #e5e5ea 1px, transparent 1px); background-size: 20px 20px; }
.preview-empty { text-align: center; color: var(--text-muted); }
.preview-empty-icon { font-size: 56px; margin-bottom: 12px; opacity: 0.3; }
.preview-empty-text { font-size: 13px; }
.device-frame { display: flex; flex-direction: column; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); background: #fff; transition: all 0.2s; }
.device-frame.web { width: 100%; height: 100%; max-width: 100%; }
.device-frame.app { width: 375px; height: 100%; max-height: 760px; }
.device-frame.pad { width: 768px; height: 100%; max-height: 95%; }
.device-frame-actions { display: flex; justify-content: flex-end; gap: 2px; padding: 4px 6px; background: #f5f5f7; border-bottom: 1px solid #e5e5ea; }
.device-action-btn { padding: 3px 8px; font-size: 11px; border: none; border-radius: 4px; background: transparent; color: #8e8e93; cursor: pointer; transition: all 0.15s; }
.device-action-btn:hover { background: #e5e5ea; color: #1d1d1f; }
.preview-iframe { width: 100%; flex: 1; border: none; display: block; }
.preview-filebar { height: 26px; background: var(--bg-titlebar); border-top: 1px solid var(--border); display: flex; align-items: center; padding: 0 12px; font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
</style>
