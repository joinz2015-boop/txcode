<template>
  <el-dialog
    title="Skill Content"
    :visible.sync="dialogVisible"
    width="800px"
    class="skill-viewer-dialog"
  >
    <div v-if="skill" class="max-h-[60vh] overflow-y-auto">
      <div class="mb-4">
        <h3 class="text-lg font-bold text-white">{{ skill.name }}</h3>
        <p class="text-textMuted text-sm mt-1">{{ skill.description }}</p>
      </div>
      <pre class="bg-sidebar p-4 rounded text-sm text-textMain overflow-x-auto whitespace-pre-wrap">{{ content }}</pre>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'SkillViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    skill: {
      type: Object,
      default: null
    },
    content: {
      type: String,
      default: ''
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    }
  }
}
</script>

<style scoped>
.skill-viewer-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}
</style>
