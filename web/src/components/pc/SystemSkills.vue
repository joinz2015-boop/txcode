<template>
  <div>
    <h3 class="text-2xl text-white font-light mb-6">System Skills</h3>
    
    <div v-if="skills.length === 0" class="text-center text-textMuted py-10">
      <i class="fa-solid fa-shapes text-4xl mb-4 opacity-30"></i>
      <p>No system Skills</p>
    </div>

    <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <label
        v-for="skill in skills"
        :key="skill.name"
        class="bg-sidebar border border-border p-3 rounded flex items-center gap-3 cursor-pointer hover:bg-active"
      >
        <input type="checkbox" :checked="skill.enabled" class="accent-accent">
        <span class="text-sm text-textMain">{{ skill.name }}</span>
      </label>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SystemSkills',
  props: {
    skills: {
      type: Array,
      default: () => []
    }
  }
}
</script>
