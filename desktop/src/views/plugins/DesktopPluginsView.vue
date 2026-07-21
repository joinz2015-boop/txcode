<template>
  <div class="plugins-page">
    <div class="page-header">
      <h2>插件</h2>
    </div>
    <div class="plugins-grid">
      <div class="plugin-card" @click="$router.push('/views/plugins/webshellManage')">
        <div class="plugin-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <line x1="8" y1="21" x2="8" y2="3"/>
            <line x1="16" y1="21" x2="16" y2="3"/>
            <line x1="2" y1="8" x2="22" y2="8"/>
            <line x1="2" y1="16" x2="22" y2="16"/>
          </svg>
        </div>
        <div class="plugin-name">WebShell</div>
        <div class="plugin-desc">远程主机终端管理，支持 SSH 连接和 AI 辅助运维</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopPluginsView',
}
</script>

<style scoped>
.plugins-page {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}
.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.plugin-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}
.plugin-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.plugin-icon {
  color: var(--accent);
  width: 64px;
  height: 64px;
  background: var(--accent-light);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plugin-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.plugin-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
