<template>
  <DesktopCodingPanel
    ref="codingPanel"
    :currentAgent="currentAgent"
    :currentModel="currentModel"
    :currentSession="currentSession"
    :runningSessionIds="runningSessionIds"
    :planFilePath="planFilePath"
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
  computed: {
    planFilePath() {
      if (this.currentSession && this.currentSession.meta && this.currentSession.meta.planFilePath) {
        return this.currentSession.meta.planFilePath
      }
      return ''
    }
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
