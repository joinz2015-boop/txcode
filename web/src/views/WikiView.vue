<template>
  <div class="wiki-view">
    <WikiSidebar ref="sidebar" />
    <WikiContent :file-path="currentPath" />
  </div>
</template>

<script>
import WikiSidebar from '@/components/wiki/WikiSidebar.vue';
import WikiContent from '@/components/wiki/WikiContent.vue';

export default {
  name: 'WikiView',
  components: {
    WikiSidebar,
    WikiContent
  },
  data() {
    return {
      currentPath: ''
    };
  },
  watch: {
    '$route.query.path': {
      immediate: true,
      handler(newPath) {
        if (newPath) {
          this.currentPath = newPath;
          if (this.$refs.sidebar) {
            this.$refs.sidebar.setCurrentPath(newPath);
          }
        } else if (!this.currentPath) {
          this.currentPath = 'getting-started/index.md';
        }
      }
    }
  },
  mounted() {
    if (!this.currentPath && this.$route.query.path) {
      this.currentPath = this.$route.query.path;
    } else if (!this.currentPath) {
      this.currentPath = 'getting-started/index.md';
    }
  }
};
</script>

<style scoped>
.wiki-view {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
