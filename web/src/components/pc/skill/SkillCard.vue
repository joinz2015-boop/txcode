<template>
  <div class="skill-card bg-sidebar border border-border rounded-lg p-4 hover:border-accent transition-colors flex flex-col">
    <div class="flex items-start gap-3 mb-3">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
        :class="installed ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'">
        <i class="fa-solid fa-shapes"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="text-white font-semibold text-sm truncate">{{ skill.name }}</h4>
          <el-tag v-if="installed" type="success" size="mini">已安装</el-tag>
        </div>
        <p class="text-textMuted text-xs mt-1 line-clamp-2">{{ skill.description || 'No description' }}</p>
      </div>
    </div>

    <div class="flex items-center gap-1 flex-wrap mb-3" v-if="skill.tags">
      <span
        v-for="tag in tagList"
        :key="tag"
        class="text-[10px] px-2 py-0.5 rounded bg-white/5 text-textMuted"
      >{{ tag }}</span>
    </div>

    <div class="flex items-center justify-between mt-auto pt-3 border-t border-border">
      <div class="flex items-center gap-3 text-xs text-textMuted">
        <span v-if="skill.latest_version" class="flex items-center gap-1">
          <i class="fa-solid fa-code-branch"></i> {{ skill.latest_version }}
        </span>
        <span v-if="skill.download_count !== undefined" class="flex items-center gap-1">
          <i class="fa-solid fa-download"></i> {{ skill.download_count }}
        </span>
      </div>
      <div>
        <el-button
          v-if="installed"
          type="danger"
          size="mini"
          plain
          @click="$emit('uninstall', skill)"
        >卸载</el-button>
        <el-button
          v-else
          type="primary"
          size="mini"
          :loading="installing"
          @click="$emit('install', skill)"
        >安装</el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkillCard',
  props: {
    skill: {
      type: Object,
      required: true
    },
    installed: {
      type: Boolean,
      default: false
    },
    installing: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    tagList() {
      if (!this.skill.tags) return [];
      return this.skill.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.skill-card {
  min-height: 160px;
}
</style>
