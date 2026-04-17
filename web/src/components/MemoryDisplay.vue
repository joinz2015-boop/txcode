<template>
  <div class="memory-display">
    <div v-if="items.length === 0" class="text-textMuted text-center py-8">
      No memories yet. Click the edit button to add some.
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="bg-sidebar rounded p-4 border border-border"
      >
        <div class="text-white whitespace-pre-wrap">{{ item.content }}</div>
        <div v-if="item.description" class="text-textMuted text-sm mt-2 whitespace-pre-wrap">{{ item.description }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MemoryDisplay',
  props: {
    items: {
      type: Array,
      default: () => []
    }
  }
}
</script>