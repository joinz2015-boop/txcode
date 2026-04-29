<template>
  <div class="local-skills-list">
    <div class="mb-4">
      <p class="text-textMuted text-xs mb-4">
        Local skills are stored in the <code class="bg-black/30 px-1 rounded">.txcode/skills/</code> directory
      </p>
    </div>

    <div v-if="skills.length === 0" class="text-center text-textMuted py-8">
      <i class="fa-solid fa-folder-open text-4xl mb-4 opacity-30"></i>
      <p>No local skills</p>
      <p class="text-xs mt-2">Download from repositories to install skills</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="skill in skills"
        :key="skill.name"
        class="bg-sidebar border border-border p-3 rounded flex justify-between items-start hover:border-accent group"
      >
        <div class="flex gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 rounded flex items-center justify-center text-xl bg-green-900/30 text-green-400 shrink-0">
            <i class="fa-solid fa-bolt"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h4 class="text-white font-bold text-sm">{{ skill.name }}</h4>
            </div>
            <p class="text-textMuted text-xs mt-1 line-clamp-2">{{ skill.description || 'No description' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <el-button type="text" size="small" @click="$emit('view', skill)">
            <i class="fa-solid fa-eye"></i>
          </el-button>
          <el-button type="text" size="small" class="delete-btn" @click="$emit('delete', skill.name)">
            <i class="fa-solid fa-trash"></i>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocalSkillsList',
  props: {
    skills: {
      type: Array,
      default: () => []
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
.delete-btn {
  color: #f56c6c !important;
}
</style>
