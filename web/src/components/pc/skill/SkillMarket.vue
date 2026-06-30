<template>
  <div class="skill-market flex flex-col h-full">
    <div class="flex items-center gap-2 mb-4 flex-wrap">
      <el-input
        v-model="keyword"
        placeholder="搜索 Skill..."
        size="small"
        class="w-[200px]"
        style="width:250px"
        clearable
        @keyup.enter="onSearch"
      >
       
      </el-input>
      <el-button size="small" type="primary" @click="onSearch">查询</el-button>
      <button
        @click="selectFilter('all')"
        class="px-3 py-1 rounded text-sm border transition-colors"
        :class="filterMode === 'all' ? 'bg-accent text-white border-accent' : 'bg-sidebar text-textMuted border-border hover:text-white hover:border-accent'"
      >全部</button>
      <button
        @click="selectFilter('installed')"
        class="px-3 py-1 rounded text-sm border transition-colors"
        :class="filterMode === 'installed' ? 'bg-accent text-white border-accent' : 'bg-sidebar text-textMuted border-border hover:text-white hover:border-accent'"
      >已安装</button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectCategory(cat.id)"
        class="px-3 py-1 rounded text-sm border transition-colors"
        :class="selectedCategoryId === cat.id ? 'bg-accent text-white border-accent' : 'bg-sidebar text-textMuted border-border hover:text-white hover:border-accent'"
      >{{ cat.name }}</button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-textMuted"></i>
    </div>

    <div v-else-if="displaySkills.length === 0" class="flex-1 flex flex-col items-center justify-center text-textMuted">
      <i class="fa-solid fa-shapes text-4xl mb-4 opacity-30"></i>
      <p>暂无 Skill</p>
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkillCard
            v-for="skill in displaySkills"
            :key="skill.id || skill.name"
            :skill="skill"
            :installed="filterMode === 'installed' ? true : isInstalled(skill.name)"
            :installing="installingIds[skill.id]"
            @install="handleInstall"
            @uninstall="handleUninstall"
            @view="handleView"
          />
        </div>
      </div>

      <div class="flex items-center justify-center pt-4 mt-auto" v-if="filterMode === 'all' && total > pageSize">
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
    },
    projectPath: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      categories: [],
      selectedCategoryId: null,
      keyword: '',
      filterMode: 'all',
      skills: [],
      localInstalledSkills: [],
      total: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      installingIds: {}
    }
  },
  computed: {
    displaySkills() {
      return this.filterMode === 'installed' ? this.localInstalledSkills : this.skills
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
    async loadLocalInstalledSkills() {
      this.loading = true
      try {
        const res = await api.getLocalSkills(this.projectPath)
        this.localInstalledSkills = res.data || []
      } catch (e) {
        console.error('Failed to load local installed skills:', e)
        this.localInstalledSkills = []
      } finally {
        this.loading = false
      }
    },
    selectFilter(mode) {
      this.filterMode = mode
      this.currentPage = 1
      this.selectedCategoryId = ''
      if (mode === 'installed') {
        this.loadLocalInstalledSkills()
      } else {
        this.loadSkills()
      }
    },
    selectCategory(categoryId) {
      this.selectedCategoryId = categoryId
      this.currentPage = 1
      this.filterMode = ''
      this.loadSkills()
    },
    onSearch() {
      this.currentPage = 1
      this.loadSkills()
    },
    handlePageChange(page) {
      this.currentPage = page
      this.loadSkills()
    },
    isInstalled(name) {
      return this.localSkills.some(s => s.name === name)
    },
    async handleInstall(skill) {
      try {
        await this.$confirm(`确定要安装 "${skill.name}" 吗？`, '确认', { type: 'info' })
      } catch (e) {
        return
      }
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
        if (this.filterMode === 'installed') {
          this.loadLocalInstalledSkills()
        }
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('卸载失败: ' + (e.message || 'Unknown error'))
        }
      }
    },
    handleView(skill) {
      this.$emit('view', skill)
    }
  }
}
</script>
