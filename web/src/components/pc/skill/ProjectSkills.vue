<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h3 class="text-2xl text-white font-light">Project Skills</h3>
        <p class="text-textMuted text-xs mt-1">
          Skills specific to your project
        </p>
      </div>
    </div>

    <div v-if="skills.length === 0" class="text-center text-textMuted py-10">
      <i class="fa-solid fa-shapes text-4xl mb-4 opacity-30"></i>
      <p>No project Skills</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="skill in skills"
        :key="skill.name"
        class="bg-sidebar border border-border p-4 rounded flex justify-between items-start hover:border-accent group"
      >
        <div class="flex gap-4">
          <div class="w-10 h-10 rounded flex items-center justify-center text-xl bg-purple-900/30 text-purple-400">
            <i class="fa-solid fa-shapes"></i>
          </div>
          <div>
            <h4 class="text-white font-bold text-sm">{{ skill.name }}</h4>
            <p class="text-textMuted text-xs h-10 overflow-hidden mt-1">{{ skill.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectSkills',
  props: {
    skills: {
      type: Array,
      default: () => []
    }
  }
}
</script>
