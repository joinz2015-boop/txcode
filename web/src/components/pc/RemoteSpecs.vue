<template>
  <div>
    <SpecRepositories
      :repositories="repositories"
      :repo-specs="repoSpecs"
      :loading-specs="loadingSpecs"
      :downloading-all="downloadingAll"
      @add="$emit('add')"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @sync="$emit('sync', $event)"
      @load-specs="$emit('load-specs', $event)"
      @download-spec="(...args) => $emit('download-spec', ...args)"
      @download-all="$emit('download-all', $event)"
    />
  </div>
</template>

<script>
import SpecRepositories from './SpecRepositories.vue'

export default {
  name: 'RemoteSpecs',
  components: {
    SpecRepositories
  },
  props: {
    repositories: {
      type: Array,
      default: () => []
    },
    repoSpecs: {
      type: Object,
      default: () => ({})
    },
    loadingSpecs: {
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
