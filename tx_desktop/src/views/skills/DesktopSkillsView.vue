<template>
  <div class="skills-view">
    <div class="market-header">
      <div class="market-title-row">
        <div class="market-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Skill 市场
          <span class="market-title-badge">{{ displayCount }} 个技能</span>
        </div>
      </div>
      <div class="market-search-wrap">
        <input type="text" class="market-search-input" v-model="searchKeyword" placeholder="搜索 Skill..." @keyup.enter="onSearch">
        <button class="market-search-btn" @click="onSearch">查询</button>
      </div>
      <div class="filter-tabs">
        <button class="filter-tab" :class="{ active: currentFilter === 'all' }" @click="setFilter('all')">全部</button>
        <button class="filter-tab" :class="{ active: currentFilter === 'installed' }" @click="setFilter('installed')">已安装</button>
        <span class="filter-divider"></span>
        <button v-for="cat in categories" :key="cat.id" class="filter-tab" :class="{ active: currentFilter === 'category_' + cat.id }" @click="setFilter('category_' + cat.id)">{{ cat.name }}</button>
      </div>
    </div>
    <div class="skill-grid-wrap">
      <div v-if="loading" class="loading-hint">加载中...</div>
      <div v-else-if="displaySkills.length === 0" class="empty-hint">暂无 Skill</div>
      <div v-else class="skill-grid">
        <div v-for="skill in displaySkills" :key="skill.id || skill.name" class="skill-card">
          <div class="skill-card-top">
            <div class="skill-card-icon" :class="getIconClass(skill)" v-html="getIconSvg(skill)"></div>
            <div class="skill-card-info">
              <div class="skill-card-name-row">
                <span class="skill-card-name">{{ skill.name }}</span>
                <span v-if="isInstalled(skill.name)" class="skill-card-badge installed">已安装</span>
              </div>
              <div class="skill-card-desc">{{ skill.description }}</div>
            </div>
          </div>
          <div class="skill-card-tags">
            <span v-for="tag in getTagList(skill.tags)" :key="tag" class="skill-card-tag">{{ tag }}</span>
          </div>
          <div class="skill-card-foot">
            <div class="skill-card-meta">
              <span v-if="skill.latest_version">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>
                {{ skill.latest_version }}
              </span>
              <span v-if="skill.download_count !== undefined">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {{ skill.download_count }}
              </span>
            </div>
            <div class="skill-card-actions">
              <template v-if="isInstalled(skill.name)">
                <button class="skill-action-btn" @click="viewSkill(skill)">查看</button>
                <button class="skill-action-btn danger" @click="handleUninstall(skill)">卸载</button>
              </template>
              <button v-else class="skill-action-btn primary" :disabled="installingIds[skill.id]" @click="handleInstall(skill)">
                {{ installingIds[skill.id] ? '安装中...' : '安装' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="pagination-row" v-if="totalPages > 1">
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
      <template v-for="p in visiblePages">
        <span v-if="p === '...'" :key="'ellipsis-' + p + '-' + Math.random()" class="pagination-btn" style="border:none;cursor:default;">…</span>
        <button v-else :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="goToPage(p)">{{ p }}</button>
      </template>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">›</button>
    </div>
    <DesktopSkillViewer
      :visible="showViewer"
      :skill="currentViewSkill"
      @close="showViewer = false"
    />
  </div>
</template>

<script>
import { getSkillCategories, getPublishedSkills, getLocalSkills, installSkillApi, uninstallSkillApi } from '@/api/index'
import DesktopSkillViewer from '@/components/skill/DesktopSkillViewer.vue'

export default {
  name: 'DesktopSkillsView',
  components: { DesktopSkillViewer },
  data() {
    return {
      currentFilter: 'all',
      currentCategoryId: null,
      currentPage: 1,
      pageSize: 9,
      searchKeyword: '',
      skills: [],
      localSkills: [],
      categories: [],
      loading: false,
      total: 0,
      installingIds: {},
      showViewer: false,
      currentViewSkill: null
    }
  },
  computed: {
    displayCount() {
      if (this.currentFilter === 'installed') {
        return this.localSkills.length
      }
      return this.total
    },
    displaySkills() {
      if (this.currentFilter === 'installed') {
        return this.localSkills
      }
      return this.skills
    },
    totalPages() {
      return Math.ceil(this.displayCount / this.pageSize) || 1
    },
    visiblePages() {
      const total = this.totalPages
      const cur = this.currentPage
      const pages = []
      for (let i = 1; i <= total; i++) {
        if (total <= 7 || i === 1 || i === total || Math.abs(i - cur) <= 1) {
          pages.push(i)
        } else if (i === 2 || i === total - 1) {
          pages.push('...')
        }
      }
      const unique = []
      for (const p of pages) {
        if (p === '...' && unique[unique.length - 1] === '...') continue
        unique.push(p)
      }
      return unique
    }
  },
  mounted() {
    this.loadCategories()
    this.loadSkills()
    this.loadLocalSkills()
  },
  methods: {
    async loadCategories() {
      try {
        const res = await getSkillCategories()
        this.categories = res.data || []
      } catch (e) {
        console.error('Failed to load skill categories:', e)
        this.categories = []
      }
    },
    async loadSkills() {
      this.loading = true
      try {
        const res = await getPublishedSkills({
          page: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.searchKeyword || undefined,
          categoryId: this.currentCategoryId || undefined
        })
        const data = res.data || {}
        this.skills = data.list || []
        this.total = data.total || 0
      } catch (e) {
        console.error('Failed to load skills:', e)
        this.skills = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async loadLocalSkills() {
      try {
        const res = await getLocalSkills()
        this.localSkills = res.data || []
      } catch (e) {
        console.error('Failed to load local skills:', e)
        this.localSkills = []
      }
    },
    isInstalled(name) {
      return this.localSkills.some(s => s.name === name)
    },
    setFilter(filter) {
      this.currentFilter = filter
      this.currentPage = 1
      if (filter === 'installed') {
        this.currentCategoryId = null
        this.loadLocalSkills()
      } else if (filter === 'all') {
        this.currentCategoryId = null
        this.loadSkills()
      } else if (filter.startsWith('category_')) {
        this.currentCategoryId = filter.split('_')[1]
        this.loadSkills()
      }
    },
    onSearch() {
      this.currentPage = 1
      if (this.currentFilter !== 'installed') {
        this.loadSkills()
      }
    },
    goToPage(page) {
      if (page < 1 || page > this.totalPages) return
      this.currentPage = page
      if (this.currentFilter !== 'installed') {
        this.loadSkills()
      }
    },
    getTagList(tags) {
      if (!tags) return []
      if (Array.isArray(tags)) return tags
      if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean)
      return []
    },
    getIconClass(skill) {
      const cat = (skill.category || '').toLowerCase()
      const map = { '工具': 'tool', '搜索': 'search', '文件': 'file', '代码': 'code', '记忆': 'memory' }
      return map[cat] || 'tool'
    },
    getIconSvg(skill) {
      const cls = this.getIconClass(skill)
      if (cls === 'tool') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      if (cls === 'search') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
      if (cls === 'file') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
      if (cls === 'code') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      if (cls === 'memory') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M12 6v6l4 2"/></svg>'
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    },
    async handleInstall(skill) {
      if (!confirm(`确定要安装 "${skill.name}" 吗？`)) return
      this.$set(this.installingIds, skill.id, true)
      try {
        await installSkillApi(skill.id, skill.name)
        await this.loadLocalSkills()
      } catch (e) {
        alert('安装失败: ' + (e.message || '未知错误'))
      } finally {
        this.$set(this.installingIds, skill.id, false)
      }
    },
    async handleUninstall(skill) {
      if (!confirm(`确定要卸载 "${skill.name}" 吗？`)) return
      try {
        await uninstallSkillApi(skill.name)
        await this.loadLocalSkills()
      } catch (e) {
        alert('卸载失败: ' + (e.message || '未知错误'))
      }
    },
    viewSkill(skill) {
      this.currentViewSkill = skill
      this.showViewer = true
    }
  }
}
</script>

<style scoped>
.skills-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.market-header { padding: 16px 20px 0; flex-shrink: 0; }
.market-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.market-title { font-size: 18px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.market-title-badge { font-size: 11px; padding: 2px 10px; border-radius: 10px; background: var(--accent-bg); color: var(--accent); font-weight: 600; }
.market-search-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.market-search-input { width: 260px; height: 34px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text-primary); background: #fff; outline: none; transition: border-color 0.15s; font-family: inherit; }
.market-search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(88,101,242,0.06); }
.market-search-input::placeholder { color: var(--text-muted); }
.market-search-btn { height: 34px; padding: 0 16px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.market-search-btn:hover { background: #4752c4; }
.filter-tabs { display: flex; align-items: center; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.filter-tab { padding: 5px 14px; border-radius: 7px; border: 1px solid var(--border); background: #fff; color: var(--text-secondary); font-size: 12.5px; cursor: pointer; transition: all 0.15s; user-select: none; font-family: inherit; font-weight: 500; white-space: nowrap; }
.filter-tab:hover { border-color: var(--accent); color: var(--accent); }
.filter-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.filter-divider { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
.skill-grid-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; }
.skill-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 1100px) { .skill-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .skill-grid { grid-template-columns: 1fr; } }
.skill-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; transition: all 0.18s; cursor: default; min-height: 170px; }
.skill-card:hover { border-color: var(--accent); box-shadow: 0 2px 12px rgba(88,101,242,0.08); transform: translateY(-1px); }
.skill-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.skill-card-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.skill-card-icon.tool { background: #e8f0fe; color: #4a6cf7; }
.skill-card-icon.search { background: #e8f5e9; color: #22c55e; }
.skill-card-icon.file { background: #fff3e0; color: #f59e0b; }
.skill-card-icon.code { background: #f3e8ff; color: #7c5cf0; }
.skill-card-icon.memory { background: #fce4ec; color: #ef4444; }
.skill-card-info { flex: 1; min-width: 0; }
.skill-card-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.skill-card-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skill-card-badge { font-size: 10px; padding: 1px 7px; border-radius: 8px; font-weight: 600; flex-shrink: 0; }
.skill-card-badge.installed { background: #dcfce7; color: #16a34a; }
.skill-card-desc { font-size: 12px; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
.skill-card-tags { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; min-height: 20px; }
.skill-card-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #f5f5f7; color: var(--text-muted); font-weight: 500; }
.skill-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 12px; border-top: 1px solid #f0f0f3; }
.skill-card-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--text-muted); }
.skill-card-meta span { display: flex; align-items: center; gap: 3px; }
.skill-card-actions { display: flex; align-items: center; gap: 6px; }
.skill-action-btn { padding: 5px 13px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; border: 1px solid var(--border); background: #fff; color: var(--text-secondary); white-space: nowrap; }
.skill-action-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
.skill-action-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.skill-action-btn.primary:hover { background: #4752c4; }
.skill-action-btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.skill-action-btn.danger { color: var(--red); border-color: transparent; background: transparent; }
.skill-action-btn.danger:hover { background: #fef2f2; border-color: #fecaca; }
.pagination-row { display: flex; align-items: center; justify-content: center; padding: 12px 20px 16px; gap: 4px; flex-shrink: 0; }
.pagination-btn { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border); background: #fff; color: var(--text-secondary); cursor: pointer; font-size: 12px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: inherit; }
.pagination-btn:hover { border-color: var(--accent); color: var(--accent); }
.pagination-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.loading-hint, .empty-hint { text-align: center; color: var(--text-muted); padding: 60px 20px; font-size: 14px; }
</style>
