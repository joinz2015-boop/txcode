<template>
  <div class="workflow-step-bar">
    <div
      v-for="step in steps"
      :key="step.id"
      class="step-item"
      :class="{ active: currentStep >= step.id, current: currentStep === step.id }"
      @click="$emit('step-change', step.id)"
    >
      <div class="step-number">{{ step.id }}</div>
      <div class="step-label">{{ step.label }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppWorkflowStep',
  props: {
    currentStep: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      steps: [
        { id: 1, label: '需求' },
        { id: 2, label: '设计' },
        { id: 3, label: '代码' },
        { id: 4, label: '测试' }
      ]
    }
  }
}
</script>

<style scoped>
.workflow-step-bar {
  display: flex;
  background: var(--bg-secondary, #121212);
  border-bottom: 1px solid var(--border-color, #27272a);
  padding: 8px 16px;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: #52525b;
  transition: all 0.2s;
}

.step-item.active {
  color: #a1a1aa;
}

.step-item.current {
  background: var(--accent, #3b82f6);
  color: white;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary, #18191b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.step-item.current .step-number {
  background: rgba(255, 255, 255, 0.2);
}

.step-label {
  font-size: 14px;
}
</style>