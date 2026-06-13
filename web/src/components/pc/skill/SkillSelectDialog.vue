<template>
  <el-dialog
    :visible="visible"
    title="选择 Skill"
    width="420px"
    :close-on-click-modal="false"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <div class="skill-select-content">
      <div class="skill-search">
        <input
          ref="searchInput"
          v-model="searchText"
          placeholder="搜索 Skill..."
          class="search-input"
        />
      </div>
      <div class="skill-list-container">
        <div v-if="loading" class="empty-state">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="filteredSkills.length === 0" class="empty-state">
          {{ searchText ? '无匹配 Skill' : '无可用 Skill' }}
        </div>
        <div
          v-for="skill in filteredSkills"
          :key="skill.name"
          class="skill-item"
          :class="{ 'skill-selected': selectedSkill === skill.name }"
          @click="selectedSkill = skill.name"
          @dblclick="handleConfirm"
        >
          <div class="skill-name">{{ skill.name }}</div>
          <div class="skill-desc" v-if="skill.description">{{ skill.description }}</div>
        </div>
      </div>
      <div class="skill-select-footer">
        <span class="selected-skill">{{ selectedSkill || '未选择' }}</span>
        <button
          class="confirm-btn"
          :disabled="!selectedSkill"
          @click="handleConfirm"
        >选择</button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { api } from '../../../api/index.js'

export default {
  name: 'SkillSelectDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      skills: [],
      selectedSkill: '',
      searchText: ''
    }
  },
  computed: {
    filteredSkills() {
      if (!this.searchText) return this.skills
      const q = this.searchText.toLowerCase()
      return this.skills.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      )
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadSkills()
        this.selectedSkill = ''
        this.searchText = ''
      }
    }
  },
  methods: {
    async loadSkills() {
      this.loading = true
      try {
        const res = await api.getSkills()
        this.skills = res.data || []
      } catch (e) {
        console.error('Load skills failed:', e)
        this.skills = []
      } finally {
        this.loading = false
        this.$nextTick(() => {
          const input = this.$refs.searchInput
          if (input) input.focus()
        })
      }
    },
    handleConfirm() {
      if (!this.selectedSkill) return
      this.$emit('select', this.selectedSkill)
      this.$emit('update:visible', false)
    },
    handleClose() {
      this.$emit('close')
    },
    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    }
  }
}
</script>

<style scoped>
.skill-select-content { height: 360px; display: flex; flex-direction: column; }
.skill-search { margin-bottom: 10px; }
.search-input { width: 100%; padding: 8px 12px; background: #27272a; border: 1px solid #3f3f46; border-radius: 4px; color: #d4d4d8; font-size: 13px; outline: none; }
.search-input:focus { border-color: #3b82f6; }
.skill-list-container { flex: 1; overflow-y: auto; border: 1px solid #3f3f46; border-radius: 4px; }
.empty-state { padding: 30px; text-align: center; color: #71717a; font-size: 13px; }
.skill-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #27272a; }
.skill-item:hover { background: #27272a; }
.skill-item.skill-selected { background: #1e3a5f; border-left: 2px solid #3b82f6; }
.skill-name { color: #d4d4d8; font-size: 13px; font-weight: 500; }
.skill-desc { color: #71717a; font-size: 12px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skill-select-footer { margin-top: 10px; display: flex; gap: 8px; align-items: center; }
.selected-skill { flex: 1; padding: 8px 12px; background: #27272a; color: #a1a1aa; font-size: 13px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.confirm-btn { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 4px; color: white; font-size: 13px; cursor: pointer; }
.confirm-btn:hover { background: #2563eb; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

:deep(.el-dialog) { background: #18181b; border: 1px solid #3f3f46; }
:deep(.el-dialog__header) { background: #18181b; border-bottom: 1px solid #3f3f46; padding: 16px 20px; }
:deep(.el-dialog__title) { color: #d4d4d8; font-size: 15px; font-weight: 500; }
:deep(.el-dialog__headerbtn) { top: 16px; right: 16px; }
:deep(.el-dialog__headerbtn .el-dialog__close) { color: #71717a; }
:deep(.el-dialog__headerbtn:hover .el-dialog__close) { color: #fff; }
:deep(.el-dialog__body) { background: #18181b; padding: 20px; color: #d4d4d8; }
</style>
