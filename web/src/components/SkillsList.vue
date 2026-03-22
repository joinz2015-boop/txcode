<template>
  <div class="skills-list">
    <!-- 技能列表 -->
    <div class="list">
      <div
        v-for="skill in skills"
        :key="skill.id || skill.name"
        class="skill-item"
      >
        <div class="skill-info">
          <div class="skill-name">{{ skill.name }}</div>
          <div class="skill-desc">{{ skill.description || '暂无描述' }}</div>
        </div>
        <el-tag :type="skill.enabled ? 'success' : 'info'" size="mini">
          {{ skill.enabled ? '启用' : '禁用' }}
        </el-tag>
      </div>

      <div v-if="skills.length === 0" class="empty">
        暂无技能
      </div>
    </div>
  </div>
</template>

<script>
/**
 * SkillsList 组件
 * 
 * 技能列表展示（只读）
 * 显示所有已加载的技能
 */
export default {
  name: 'SkillsList',

  props: {
    skills: {
      type: Array,
      default: () => [],
    },
  },
};
</script>

<style scoped>
.skills-list {
  padding: 10px 0;
}

.skill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 10px;
}

.skill-name {
  font-weight: bold;
  font-size: 14px;
}

.skill-desc {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}

.empty {
  text-align: center;
  color: #909399;
  padding: 40px;
}
</style>
