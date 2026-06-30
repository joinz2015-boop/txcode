<template>
  <div class="skill-market flex flex-col h-full">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectCategory(cat.id)"
          class="px-3 py-1 rounded text-xs border transition-colors"
          :class="selectedCategoryId === cat.id ? 'bg-accent text-white border-accent' : 'bg-sidebar text-textMuted border-border hover:text-white hover:border-accent'"
        >{{ cat.name }}</button>
        <button
          @click="selectCategory(null)"
          class="px-3 py-1 rounded text-xs border transition-colors"
          :class="selectedCategoryId === null ? 'bg-accent text-white border-accent' : 'bg-sidebar text-textMuted border-border hover:text-white hover:border-accent'"
        >全部</button>
      </div>

      <div class="flex items-center gap-2">
        <el-input
          v-model="keyword"
          placeholder="搜索 Skill..."
          size="small"
          class="w-[200px]"
          clearable
          @input="onSearchInput"
        >
          <template #prefix>
            <i class="fa-solid fa-search text-textMuted"></i>
          </template>
        </el-input>
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-textMuted"></i>
    </div>

    <div v-else-if="skills.length === 0" class="flex-1 flex flex-col items-center justify-center text-textMuted">
      <i class="fa-solid fa-shapes text-4xl mb-4 opacity-30"></i>
      <p>暂无 Skill</p>
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkillCard
            v-for="skill in skills"
            :key="skill.id"
            :skill="skill"
            :installed="isInstalled(skill.name)"
            :installing="installingIds[skill.id]"
            @install="handleInstall"
            @uninstall="handleUninstall"
          />
        </div>
      </div>

      <div class="flex items-center justify-center pt-4 mt-auto" v-if="total > pageSize">
        <el-pagination
          background
          small
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { api } from '../../../api'
import SkillCard from './SkillCard.vue'

export default {
  name: 'SkillMarket',
  components: { SkillCard },
  props: {
    localSkills: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      categories: [],
      selectedCategoryId: null,
      keyword: '',
      skills: [],
      total: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      installingIds: {},
      searchTimer: null
    }
  },
  created() {
    this.loadCategories()
    this.loadSkills()
  },
  methods: {
    async loadCategories() {
      try {
        const res = await api.getSkillCategories()
        this.categories = res.data || []
      } catch (e) {
        console.error('Failed to load categories:', e)
      }
    },
    async loadSkills() {
      this.loading = true
      try {
        const res = await api.getPublishedSkills({
          page: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.keyword || undefined,
          categoryId: this.selectedCategoryId || undefined
        })
        const data = res.data || {}
        this.skills = data.list || []
        this.total = data.total || 0
      } catch (e) {
        console.error('Failed to load skills:', e)
        this.skills = []
      } finally {
        this.loading = false
      }
    },
    selectCategory(categoryId) {
      this.selectedCategoryId = categoryId
      this.currentPage = 1
      this.loadSkills()
    },
    onSearchInput() {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.currentPage = 1
        this.loadSkills()
      }, 300)
    },
    handlePageChange(page) {
      this.currentPage = page
      this.loadSkills()
    },
    isInstalled(name) {
      return this.localSkills.some(s => s.name === name)
    },
    async handleInstall(skill) {
      this.$set(this.installingIds, skill.id, true)
      try {
        await api.installSkill(skill.id, skill.name)
        this.$message.success(`安装成功: ${skill.name}`)
        this.$emit('refresh-local')
      } catch (e) {
        this.$message.error('安装失败: ' + (e.message || 'Unknown error'))
      } finally {
        this.$set(this.installingIds, skill.id, false)
      }
    },
    async handleUninstall(skill) {
      try {
        await this.$confirm(`确定要卸载 "${skill.name}" 吗？`, '确认', { type: 'warning' })
        await api.uninstallSkill(skill.name)
        this.$message.success(`卸载成功: ${skill.name}`)
        this.$emit('refresh-local')
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('卸载失败: ' + (e.message || 'Unknown error'))
        }
      }
    }
  }
}
</script>
