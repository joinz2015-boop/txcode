<template>
  <div class="nav-rail">
    <div class="nav-top">
      <router-link to="/views/code/coding" class="nav-item" title="编码">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
      </router-link>
      <router-link to="/views/design/designView" class="nav-item" title="设计">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      </router-link>
      <router-link to="/views/specs/specsView" class="nav-item" title="规范">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </router-link>
      <router-link to="/views/skills/skillsView" class="nav-item" title="Skill">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </router-link>
    </div>
    <div class="nav-bottom">
      <router-link to="/views/settings/settingsView" class="nav-item" title="设置">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopNavRail',
}
</script>

<style scoped>
.nav-rail {
  width: 48px;
  min-width: 48px;
  max-width: 48px;
  background: #f0f0f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  border-right: 1px solid var(--border);
  user-select: none;
  flex-shrink: 0;
  justify-content: space-between;
}
.nav-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
}
.nav-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
  margin-bottom: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
.nav-item.router-link-exact-active,
.nav-item.router-link-active {
  background: var(--accent-light);
  color: var(--accent);
}
</style>
