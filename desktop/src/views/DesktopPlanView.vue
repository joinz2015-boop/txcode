<template>
  <DesktopPlanPanel
    ref="planPanel"
    :currentSession="currentSession"
    :currentModel="currentModel"
    :runningSessionIds="runningSessionIds"
    @refreshSessions="$emit('refreshSessions')"
  />
</template>

<script>
import DesktopPlanPanel from '@/components/plan/DesktopPlanPanel.vue'

export default {
  name: 'DesktopPlanView',
  components: { DesktopPlanPanel },
  props: {
    currentSession: { type: Object, default: null },
    currentModel: { type: String, default: 'DeepSeek V3' },
    runningSessionIds: { type: Array, default: () => [] }
  },
  methods: {
    open(data) {
      if (data && this.$refs.planPanel) {
        this.$refs.planPanel.open(data)
      }
    }
  }
}
</script>
