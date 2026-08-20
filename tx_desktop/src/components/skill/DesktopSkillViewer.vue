<template>
  <div v-if="visible" class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>{{ skill ? skill.name : '技能详情' }}</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div v-if="loading" class="loading-hint">加载中...</div>
        <template v-else>
          <p v-if="skill && skill.description" class="skill-desc">{{ skill.description }}</p>
          <pre class="skill-content">{{ content }}</pre>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { getSkillContent } from '@/api/index'

export default {
  name: 'DesktopSkillViewer',
  props: {
    visible: Boolean,
    skill: Object
  },
  emits: ['close'],
  data() {
    return {
      content: '',
      loading: false
    }
  },
  watch: {
    async visible(val) {
      if (val && this.skill) {
        await this.loadContent()
      }
    }
  },
  methods: {
    async loadContent() {
      this.loading = true
      try {
        const res = await getSkillContent(this.skill.name)
        this.content = res.data || ''
      } catch (e) {
        this.content = '加载失败: ' + (e.message || '未知错误')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 700px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 16px; }
.skill-desc {
  font-size: 13px; color: var(--text-muted); margin-bottom: 12px; padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.skill-content {
  font-size: 13px; color: var(--text-primary); background: #f8f9fb;
  padding: 16px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap;
  line-height: 1.6; margin: 0; font-family: inherit;
}
.loading-hint { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
</style>
