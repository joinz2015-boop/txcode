<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择 Skill</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div v-if="loading" class="loading-hint">加载中...</div>
        <div v-else-if="skills.length === 0" class="empty-hint">暂无可用 Skill</div>
        <div v-for="skill in skills" :key="skill.name" class="skill-item" :class="{ selected: selected === skill.name }" @click="selected = skill.name">
          <span class="skill-icon">⚡</span>
          <div class="skill-info">
            <div class="skill-name">{{ skill.name }}</div>
            <div class="skill-desc" v-if="skill.description">{{ skill.description }}</div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="confirmSelect" :disabled="!selected">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getSkills, getLocalSkills } from '@/api/index'

export default {
  name: 'DesktopSkillSelectDialog',
  emits: ['close', 'select'],
  data() {
    return {
      skills: [],
      loading: false,
      selected: ''
    }
  },
  mounted() {
    this.loadSkills()
  },
  methods: {
    async loadSkills() {
      this.loading = true
      try {
        const [r1, r2] = await Promise.all([getSkills().catch(() => ({ data: [] })), getLocalSkills().catch(() => ({ data: [] }))])
        const all = [...(r1.data || []), ...(r2.data || [])]
        const seen = new Set()
        this.skills = all.filter(s => {
          const key = s.name || s
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).map(s => typeof s === 'string' ? { name: s } : s)
      } catch (e) {
        this.skills = []
      } finally {
        this.loading = false
      }
    },
    confirmSelect() {
      if (this.selected) {
        this.$emit('select', this.selected)
        this.$emit('close')
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
  width: 460px; max-width: 90vw; max-height: 70vh; display: flex; flex-direction: column;
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
.dialog-body { flex: 1; overflow-y: auto; padding: 12px; }
.skill-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 6px;
  cursor: pointer; transition: background 0.1s; margin-bottom: 4px;
}
.skill-item:hover { background: var(--bg-hover); }
.skill-item.selected { background: var(--accent-light); border: 1px solid var(--accent); }
.skill-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.skill-info { flex: 1; min-width: 0; }
.skill-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.skill-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.empty-hint, .loading-hint { text-align: center; color: var(--text-muted); padding: 30px; font-size: 13px; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
