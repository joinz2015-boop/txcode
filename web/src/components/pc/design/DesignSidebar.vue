<template>
  <aside class="bg-[#121212] border border-[#1e1e1e] flex flex-col shrink-0 overflow-hidden" style="width: 480px;">
    <div class="flex border-b border-[#1e1e1e] bg-[#121212]">
      <div
        class="flex-1 text-center px-3 py-2.5 cursor-pointer text-sm border-b-2 transition-colors"
        :class="activeTab === 'pages' ? 'border-[#60a5fa] text-[#f4f4f5]' : 'border-transparent text-[#84848a] hover:text-[#f4f4f5]'"
        @click="activeTab = 'pages'"
      >
        <i class="fa-solid fa-file-code mr-1"></i> 设计页面
      </div>
      <div
        class="flex-1 text-center px-3 py-2.5 cursor-pointer text-sm border-b-2 transition-colors"
        :class="activeTab === 'ai' ? 'border-[#60a5fa] text-[#f4f4f5]' : 'border-transparent text-[#84848a] hover:text-[#f4f4f5]'"
        @click="activeTab = 'ai'"
      >
        <i class="fa-solid fa-robot mr-1"></i> AI设计助手
      </div>
    </div>

    <DesignPageTree
      ref="pageTree"
      v-show="activeTab === 'pages'"
      :base-path="basePath"
      @open-file="$emit('open-file', $event)"
      @current-page="currentPage = $event"
      @file-changed="$emit('file-changed')"
    />

    <keep-alive>
      <DesignAiChat
        v-if="activeTab === 'ai'"
        :base-path="basePath"
        :current-page="currentPage"
        @design-updated="$emit('file-changed')"
        @status-change="$emit('ai-status-change', $event)"
      />
    </keep-alive>
  </aside>
</template>

<script>
import DesignPageTree from './DesignPageTree.vue'
import DesignAiChat from './DesignAiChat.vue'

export default {
  name: 'DesignSidebar',
  components: { DesignPageTree, DesignAiChat },
  props: {
    basePath: { type: String, default: '.txcode/design' }
  },
  data() {
    return {
      activeTab: 'pages',
      currentPage: ''
    }
  },
  methods: {
    setCurrentPage(path) {
      this.currentPage = path
      if (this.$refs.pageTree) {
        this.$refs.pageTree.selectByPath(path)
      }
    }
  }
}
</script>
