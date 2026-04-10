<template>
  <div class="wiki-sidebar">
    <div class="sidebar-header">
      <i class="fa-solid fa-book"></i>
      <span>文档中心</span>
    </div>
    <el-tree
      :data="menuData"
      :props="treeProps"
      node-key="url"
      :current-node-key="currentPath"
      :highlight-current="true"
      @node-click="handleNodeClick"
      class="wiki-tree"
    >
      <template #default="{ node, data }">
        <div class="tree-node">
          <i v-if="data.icon" :class="data.icon"></i>
          <span>{{ data.title }}</span>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script>
import { api } from '@/api';

export default {
  name: 'WikiSidebar',
  data() {
    return {
      menuData: [],
      treeProps: {
        children: 'children',
        label: 'title'
      },
      currentPath: ''
    };
  },
  methods: {
    async loadMenu() {
      try {
        const res = await api.getWikiMenu();
        if (res.success && res.data) {
          this.menuData = res.data.nav || [];
          if (this.menuData.length > 0 && !this.currentPath) {
            this.currentPath = this.menuData[0].url;
          }
        }
      } catch (error) {
        console.error('Failed to load wiki menu:', error);
      }
    },
    handleNodeClick(data) {
      const url = data.url;
      if (url) {
        const match = url.match(/\/txcode\/(.+)\.html?$/);
        if (match) {
          const mdPath = match[1] + '.md';
          this.$router.push({ name: 'wiki', query: { path: mdPath } });
        } else {
          this.$router.push({ name: 'wiki', query: { path: url } });
        }
      }
    },
    setCurrentPath(path) {
      this.currentPath = path;
    }
  },
  created() {
    this.loadMenu();
  }
};
</script>

<style scoped>
.wiki-sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 16px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wiki-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.wiki-tree :deep(.el-tree-node__content) {
  height: 36px;
}

.wiki-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #e6f7ff;
  color: #1890ff;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.tree-node i {
  width: 16px;
  text-align: center;
  color: #666;
}
</style>
