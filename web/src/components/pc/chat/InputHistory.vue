<template>
  <div v-if="historyItems.length > 1" class="input-history">
    <div class="history-list">
      <div
        v-for="item in historyItems"
        :key="item._id"
        class="history-item"
        :class="{ 'history-item-latest': item._id === latestId }"
        @click="scrollToItem(item._id)"
      >
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InputHistory',
  props: {
    logItems: { type: Array, default: () => [] },
  },
  computed: {
    historyItems() {
      return this.logItems
        .filter(item => item.type === 'chat')
        .map(item => ({ _id: item._id, content: item.content }))
    },
    latestId() {
      return this.historyItems.length > 0 ? this.historyItems[this.historyItems.length - 1]._id : null
    },
  },
  methods: {
    scrollToItem(id) {
      const el = document.querySelector(`[data-log-id="${id}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
  },
}
</script>

<style scoped>
.input-history {
  position: absolute;
  top: 46px;
  right: 12px;
  z-index: 10;
  width: 220px;
  max-height: 300px;
  background: var(--color-hoverBg, #1e1e30);
  border: 1px solid var(--color-contentBg);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.input-history-empty {
  width: auto;
  padding: 6px 12px;
}
.history-list {
  overflow-y: auto;
  flex: 1;
}
.history-item {
  padding: 5px 10px;
  font-size: 12px;
  color: var(--color-textMain);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid rgba(128, 128, 128, 0.08);
  transition: background 0.15s;
}
.history-item:hover {
  background: rgba(128, 128, 128, 0.15);
}
.history-item-latest {
  font-weight: 600;
  color: var(--color-accent);
}
.history-empty-text {
  font-size: 11px;
  color: var(--color-textMuted);
}
</style>
