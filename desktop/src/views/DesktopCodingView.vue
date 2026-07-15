<template>
  <DesktopCodingPanel
    ref="codingPanel"
    :currentAgent="currentAgent"
    :currentModel="currentModel"
    :currentSession="currentSession"
    :runningSessionIds="runningSessionIds"
    @update:agent="$emit('update:agent', $event)"
    @update:model="$emit('update:model', $event)"
  />
</template>

<script>
import DesktopCodingPanel from '@/components/coding/DesktopCodingPanel.vue'

export default {
  name: 'DesktopCodingView',
  components: { DesktopCodingPanel },
  props: {
    currentAgent: { type: String, default: 'Code Agent' },
    currentModel: { type: String, default: 'DeepSeek V3' },
    currentSession: { type: Object, default: null },
    runningSessionIds: { type: Array, default: () => [] }
  },
  methods: {
    open(data) {
      if (data && this.$refs.codingPanel) {
        this.$refs.codingPanel.open(data)
      }
    }
  }
}
</script>

<style scoped>
</style>
