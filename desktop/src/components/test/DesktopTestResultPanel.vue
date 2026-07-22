<template>
  <div class="test-result-panel">
    <div class="url-bar">
      <input
        v-model="testUrl"
        placeholder="输入测试地址 (Enter 跳转)..."
        class="url-input"
        @keydown.enter="navigateUrl"
      />
      <button class="url-btn" @click="navigateUrl" :disabled="!testUrl.trim()">跳转</button>
    </div>
    <div class="status-bar">
      <span class="status-dot" :class="statusClass"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopTestResultPanel',
  data() {
    return {
      testUrl: '',
      status: 'ready'
    }
  },
  computed: {
    statusClass() {
      const map = { ready: 'dot-ready', running: 'dot-running', done: 'dot-done', error: 'dot-error' }
      return map[this.status] || 'dot-ready'
    },
    statusText() {
      const map = { ready: '就绪', running: '执行中', done: '完成', error: '错误' }
      return map[this.status] || '就绪'
    }
  },
  methods: {
    navigateUrl() {
      const url = this.testUrl.trim()
      if (!url) return
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : 'http://' + url
      window.location.href = fullUrl
    },
    setStatus(status) {
      this.status = status
    }
  },
  mounted() {
    const hash = window.location.hash || ''
    const queryIdx = hash.indexOf('?')
    const params = new URLSearchParams(queryIdx >= 0 ? hash.substring(queryIdx + 1) : '')
    const urlParam = params.get('testUrl') || ''
    if (urlParam) this.testUrl = urlParam
  }
}
</script>

<style scoped>
.test-result-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
  background: var(--bg-primary, #f5f6fa);
  padding: 40px;
}

.url-bar {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 560px;
}

.url-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 8px;
  outline: none;
  font-family: inherit;
  color: var(--text-primary);
  background: #fff;
}
.url-input:focus { border-color: var(--accent, #4f6ef7); }

.url-btn {
  padding: 10px 20px;
  font-size: 14px;
  background: var(--accent, #4f6ef7);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.url-btn:hover { background: #6366f1; }
.url-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border: 1px solid var(--border, #e0e0e0);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-ready { background: #94a3b8; }
.dot-running {
  background: var(--accent, #4f6ef7);
  animation: pulse 1.5s ease-in-out infinite;
}
.dot-done { background: #22c55e; }
.dot-error { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
