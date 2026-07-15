<template>
  <DesktopPlanPanel
    ref="planPanel"
    :currentSession="currentSession"
  />
</template>

<script>
import DesktopPlanPanel from '@/components/plan/DesktopPlanPanel.vue'

export default {
  name: 'DesktopPlanView',
  components: { DesktopPlanPanel },
  props: {
    currentSession: { type: Object, default: null }
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
