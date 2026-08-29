<template>
  <div v-if="chatLogItems.length > 0" class="user-rail" @mouseleave="hideTip">
    <button class="rail-btn" title="滚动到最顶端" @click="$emit('scroll-to-top')">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
    <div class="rail-stem">
      <div class="rail-dashes">
        <span
          v-for="(item, idx) in chatLogItems"
          :key="item.logId"
          class="rail-dash"
          :title="'第 ' + (idx + 1) + ' 次用户输入'"
          @mouseenter="showTip(item)"
          @mouseleave="hideTip"
          @click="$emit('scroll-to-log', item.logId)"
        ></span>
      </div>
    </div>
    <button class="rail-btn" title="滚动到最低端" @click="$emit('scroll-to-bottom')">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div
      v-if="tipItem"
      ref="tooltip"
      class="rail-tooltip"
      :title="'点击定位到该条输入（仅滚动，不改变布局）'"
      @click="$emit('scroll-to-log', tipItem.logId)"
      v-html="tipText"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'DesktopUserRail',
  props: {
    logItems: { type: Array, default: () => [] }
  },
  emits: ['scroll-to-top', 'scroll-to-bottom', 'scroll-to-log'],
  data() {
    return {
      tipItem: null
    }
  },
  computed: {
    chatLogItems() {
      return (this.logItems || []).filter(item => item.type === 'chat')
    },
    tipText() {
      if (!this.tipItem) return ''
      return this.esc(this.tipItem.content).replace(/\n/g, '<br>')
    }
  },
  methods: {
    esc(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    showTip(item) {
      this.tipItem = item
    },
    hideTip(e) {
      if (e && e.relatedTarget && this.$refs.tooltip && this.$refs.tooltip.contains(e.relatedTarget)) return
      this.tipItem = null
    }
  }
}
</script>

<style scoped>
.user-rail {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  user-select: none;
  filter: drop-shadow(0 2px 8px rgba(79, 110, 247, 0.12));
}
.rail-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  transition: all 0.15s;
}
.rail-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.35);
}
.rail-stem {
  width: 26px;
  flex: 1;
  min-height: 48px;
  background: transparent;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rail-dashes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 8px 0;
  cursor: pointer;
  max-height: 320px;
  overflow-y: auto;
  flex-shrink: 0;
}
.rail-dashes::-webkit-scrollbar { width: 3px; }
.rail-dashes::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 2px; }
.rail-dashes::-webkit-scrollbar-track { background: transparent; }
.rail-dash {
  width: 14px;
  height: 3px;
  border-radius: 2px;
  background: #c3c7d1;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
  position: relative;
  transition: width 0.15s, background 0.15s, transform 0.15s;
}
.rail-dash:hover {
  background: #9aa1b0;
  transform: scaleY(1.4);
}
.rail-dashes:hover .rail-dash { width: 16px; }

.rail-tooltip {
  position: absolute;
  right: calc(100% + 14px);
  top: 50%;
  transform: translateY(-50%);
  width: 380px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  padding: 10px 14px;
  z-index: 40;
  font-size: 12.5px;
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-word;
  cursor: pointer;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.12s;
}
.rail-tooltip:hover { border-color: var(--accent); }
.rail-tooltip::before {
  content: '';
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 14px;
}
</style>
