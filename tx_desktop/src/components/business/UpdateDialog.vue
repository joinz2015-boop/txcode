<template>
  <div class="overlay" @click.self="handleClose">
    <div class="dialog">
      <div class="dialog-header">
        <span>发现新版本</span>
        <button class="dialog-close" @click="handleClose">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="version-row">
          <span class="version-label">当前版本</span>
          <span class="version-value">v{{ localVersion }}</span>
        </div>
        <div class="version-row highlight">
          <span class="version-label">最新版本</span>
          <span class="version-value">
            v{{ latestVersion }}
            <span v-if="latestType" class="version-type">{{ latestType }}</span>
          </span>
        </div>
        <div class="version-row" v-if="latestReleaseDate">
          <span class="version-label">发布日期</span>
          <span class="version-value">{{ latestReleaseDate }}</span>
        </div>
        <div class="update-section" v-if="latestDescription">
          <div class="section-title">更新说明</div>
          <div class="section-content">{{ latestDescription }}</div>
        </div>
        <div class="update-section">
          <div class="section-title">更新方式</div>
          <div class="section-content">
            <div class="way-row">
              <span class="way-label">npm 版</span>
              <code class="way-code">npm install -g tianxincode</code>
            </div>
            <div class="way-row">
              <span class="way-label">桌面版</span>
              <a href="javascript:void(0)" class="website-link" @click="openWebsite">{{ desktopUrl }}</a>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="handleClose">关闭</button>
        <button class="btn-primary" @click="openWebsite">前往官网下载</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UpdateDialog',
  props: {
    visible: { type: Boolean, default: false },
    checkResult: { type: Object, default: null },
  },
  emits: ['close'],
  data() {
    return {
      desktopUrl: 'http://txcode.homecommunity.cn/home/install.html',
    }
  },
  computed: {
    latestInfo() {
      return (this.checkResult && this.checkResult.latestInfo) || {}
    },
    localVersion() {
      return String(this.checkResult?.localVersion || '').replace(/^v/i, '')
    },
    latestVersion() {
      return String(this.checkResult?.latestVersion || '').replace(/^v/i, '')
    },
    latestType() {
      return this.latestInfo.version_type || ''
    },
    latestReleaseDate() {
      return this.latestInfo.release_date || ''
    },
    latestDescription() {
      return this.latestInfo.description || ''
    },
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    openWebsite() {
      window.open(this.desktopUrl, '_blank')
    },
  },
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  width: 460px;
  max-width: 90vw;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.dialog-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.version-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
}
.version-row.highlight .version-value { color: #ef4444; font-weight: 600; }
.version-label {
  width: 70px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
}
.version-value { color: var(--text-primary); }
.version-type {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 11px;
  vertical-align: middle;
}
.update-section {
  margin-top: 14px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.section-content {
  font-size: 12.5px;
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
}
.way-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.way-label {
  flex-shrink: 0;
  color: var(--text-muted);
}
.way-code {
  padding: 2px 8px;
  background: #f0f1f4;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: Consolas, Menlo, Monaco, monospace;
  font-size: 12px;
  color: var(--text-primary);
  word-break: break-all;
}
.website-link {
  color: var(--accent);
  text-decoration: none;
  cursor: pointer;
  word-break: break-all;
}
.website-link:hover { text-decoration: underline; }
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-primary {
  padding: 6px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}
.btn-primary:hover { background: var(--accent-hover, #3d57d9); }
</style>
