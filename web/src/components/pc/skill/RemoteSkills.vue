<template>
  <div>
    <SkillRepositories
      :repositories="repositories"
      :repo-skills="repoSkills"
      :loading-skills="loadingSkills"
      :downloading-all="downloadingAll"
      @add="$emit('add')"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @sync="$emit('sync', $event)"
      @load-skills="$emit('load-skills', $event)"
      @download-skill="(...args) => $emit('download-skill', ...args)"
      @download-all="$emit('download-all', $event)"
    />
  </div>
</template>

<script>
import SkillRepositories from './SkillRepositories.vue'

export default {
  name: 'RemoteSkills',
  components: {
    SkillRepositories
  },
  props: {
    repositories: {
      type: Array,
      default: () => []
    },
    repoSkills: {
      type: Object,
      default: () => ({})
    },
    loadingSkills: {
      type: Object,
      default: () => ({})
    },
    downloadingAll: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>
