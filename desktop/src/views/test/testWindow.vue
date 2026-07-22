<template>
  <div class="test-window">
    <DesktopTestResultPanel ref="resultPanel" />
  </div>
</template>

<script>
import DesktopTestResultPanel from '@/components/test/DesktopTestResultPanel.vue'

export default {
  name: 'TestWindow',
  components: { DesktopTestResultPanel }
}
</script>

<style scoped>
.test-window {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary, #f5f6fa);
}
</style>
