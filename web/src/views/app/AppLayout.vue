<template>
  <div class="app-layout">
    <header v-if="isHome" class="app-header">
      <div class="header-left">
        <i class="fa-solid fa-robot text-accent"></i>
        <span>TXCode</span>
      </div>
    </header>

    <main class="app-content">
      <router-view />
    </main>

    
  </div>
</template>

<script>
export default {
  name: 'AppLayout',
  computed: {
    isHome() {
      return this.$route.path === '/app'
    }
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  background: #0a0a09;
}

.app-header {
  background: #121212;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #27272a;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 16px;
  color: #f4f4f5;
}

.header-left i {
  color: #3b82f6;
}

.app-content {
  flex: 1;
  overflow-y: auto;
}

.app-tabbar {
  position: sticky;
  bottom: 0;
  background: #121212;
  border-top: 1px solid #27272a;
  display: flex;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  color: #84848a;
  font-size: 10px;
  text-decoration: none;
  transition: color 0.2s;
}

.tab-item i {
  font-size: 20px;
}

.tab-item.active {
  color: #3b82f6;
}
</style>
