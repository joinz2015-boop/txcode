<template>
  <div class="specs-view">
    <div class="market-header">
      <div class="market-title-row">
        <div class="market-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          开发规范
          <span class="market-title-badge">{{ filteredCount }} 项规范</span>
        </div>
      </div>
      <div class="market-search-wrap">
        <input type="text" class="market-search-input" v-model="searchKeyword" placeholder="搜索规范..." @keyup.enter="onSearch">
        <button class="market-search-btn" @click="onSearch">查询</button>
      </div>
      <div class="filter-tabs">
        <button class="filter-tab" :class="{ active: currentFilter === 'all' }" @click="setFilter('all')">全部</button>
        <button class="filter-tab" :class="{ active: currentFilter === 'installed' }" @click="setFilter('installed')">已安装</button>
        <span class="filter-divider"></span>
        <button v-for="cat in categories" :key="cat.id" class="filter-tab" :class="{ active: currentFilter === 'category_' + cat.id }" @click="setFilter('category_' + cat.id)">{{ cat.name }}</button>
      </div>
    </div>
    <div class="spec-grid-wrap">
      <div v-if="loading" class="loading-hint">加载中...</div>
      <div v-else-if="pagedSpecs.length === 0" class="empty-hint">暂无规范</div>
      <div v-else class="spec-grid">
        <div v-for="spec in pagedSpecs" :key="spec.id || spec.name" class="spec-card">
          <div class="spec-card-top">
            <div class="spec-card-icon" :class="getIconClass(spec)" v-html="getIconSvg(spec)"></div>
            <div class="spec-card-info">
              <div class="spec-card-name-row">
                <span class="spec-card-name">{{ spec.name }}</span>
                <span v-if="isInstalled(spec.name)" class="spec-card-badge applied">已安装</span>
              </div>
              <div class="spec-card-desc">{{ spec.description }}</div>
            </div>
          </div>
          <div class="spec-card-tags" v-if="spec.tags && spec.tags.length">
            <span v-for="tag in spec.tags" :key="tag" class="spec-card-tag">{{ tag }}</span>
          </div>
          <div class="spec-card-foot">
            <div class="spec-card-meta">
              <span v-if="spec.updated_at">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ formatDate(spec.updated_at) }}
              </span>
              <span v-if="spec.latest_version">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>
                {{ spec.latest_version }}
              </span>
              <span v-if="spec.download_count !== undefined">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {{ spec.download_count }}
              </span>
              <span v-if="spec.filePath">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                {{ spec.filePath }}
              </span>
            </div>
            <div class="spec-card-actions">
              <template v-if="isInstalled(spec.name)">
                <button class="spec-action-btn" @click="viewSpec(spec)">查看</button>
                <button class="spec-action-btn" style="color:var(--red);border-color:transparent;background:transparent;" @click="removeSpec(spec)">移除</button>
              </template>
              <button v-else class="spec-action-btn primary" :disabled="installingIds[spec.id]" @click="applySpec(spec)">
                {{ installingIds[spec.id] ? '安装中...' : '安装' }}
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
    <DesktopSpecViewer
      :visible="showViewer"
      :spec="currentViewSpec"
      @close="showViewer = false"
    />
  </div>
</template>

<script>
import { getSpecCategories, getPublishedSpecs, getLocalSpecs, installSpec, uninstallSpec } from '@/api/index'
import DesktopSpecViewer from '@/components/spec/DesktopSpecViewer.vue'

export default {
  name: 'DesktopSpecsView',
  components: { DesktopSpecViewer },
  data() {
    return {
      currentFilter: 'all',
      currentCategoryId: null,
      currentPage: 1,
      pageSize: 9,
      searchKeyword: '',
      specs: [],
      localSpecs: [],
      categories: [],
      loading: false,
      total: 0,
      installingIds: {},
      showViewer: false,
      currentViewSpec: null
    }
  },
  computed: {
    filteredLocalSpecs() {
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return this.localSpecs
      return this.localSpecs.filter(s =>
        s.name.toLowerCase().includes(kw) ||
        (s.description || '').toLowerCase().includes(kw)
      )
    },
    filteredCount() {
      if (this.currentFilter === 'installed') {
        return this.filteredLocalSpecs.length
      }
      return this.total
    },
    totalPages() {
      return Math.ceil(this.filteredCount / this.pageSize)
    },
    pagedSpecs() {
      if (this.currentFilter === 'installed') {
        const start = (this.currentPage - 1) * this.pageSize
        return this.filteredLocalSpecs.slice(start, start + this.pageSize)
      }
      return this.specs
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
    this.loadSpecs()
    this.loadLocalSpecs()
  },
  methods: {
    async loadCategories() {
      try {
        const res = await getSpecCategories()
        this.categories = res.data || []
      } catch (e) {
        console.error('Failed to load spec categories:', e)
        this.categories = []
      }
    },
    async loadSpecs() {
      this.loading = true
      try {
        const res = await getPublishedSpecs({
          page: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.searchKeyword || undefined,
          categoryId: this.currentCategoryId || undefined
        })
        const data = res.data || {}
        this.specs = data.list || []
        this.total = data.total || 0
      } catch (e) {
        console.error('Failed to load specs:', e)
        this.specs = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async loadLocalSpecs() {
      try {
        const res = await getLocalSpecs()
        this.localSpecs = res.data?.specs || []
      } catch (e) {
        console.error('Failed to load local specs:', e)
        this.localSpecs = []
      }
    },
    isInstalled(name) {
      return this.localSpecs.some(s => s.name === name)
    },
    setFilter(filter) {
      this.currentFilter = filter
      this.currentPage = 1
      if (filter === 'installed') {
        this.currentCategoryId = null
      } else if (filter === 'all') {
        this.currentCategoryId = null
        this.loadSpecs()
      } else if (filter.startsWith('category_')) {
        this.currentCategoryId = parseInt(filter.split('_')[1])
        this.loadSpecs()
      }
    },
    onSearch() {
      this.currentPage = 1
      if (this.currentFilter !== 'installed') {
        this.loadSpecs()
      }
    },
    goToPage(page) {
      if (page < 1 || page > this.totalPages) return
      this.currentPage = page
      if (this.currentFilter !== 'installed') {
        this.loadSpecs()
      }
    },
    getIconClass(spec) {
      const cat = (spec.platform_category || '').toLowerCase()
      if (cat.includes('前端') || cat.includes('frontend')) return 'frontend'
      if (cat.includes('后端') || cat.includes('backend')) return 'backend'
      if (cat.includes('工具') || cat.includes('toolchain')) return 'toolchain'
      if (cat.includes('数据库') || cat.includes('database')) return 'database'
      if (cat.includes('质量') || cat.includes('quality')) return 'quality'
      return 'frontend'
    },
    getIconSvg(spec) {
      const cls = this.getIconClass(spec)
      if (cls === 'frontend') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      if (cls === 'backend') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>'
      if (cls === 'toolchain') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      if (cls === 'database') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
      if (cls === 'quality') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    async applySpec(spec) {
      if (!confirm(`确定要安装 "${spec.name}" 吗？`)) return
      this.$set(this.installingIds, spec.id, true)
      try {
        await installSpec(spec.id, spec.name)
        await this.loadLocalSpecs()
      } catch (e) {
        alert('安装失败: ' + (e.message || '未知错误'))
      } finally {
        this.$set(this.installingIds, spec.id, false)
      }
    },
    async removeSpec(spec) {
      if (!confirm(`确定要移除 "${spec.name}" 规范吗？\n\n移除后该规范将不再应用于当前项目。`)) return
      try {
        await uninstallSpec(spec.name)
        await this.loadLocalSpecs()
      } catch (e) {
        alert('移除失败: ' + (e.message || '未知错误'))
      }
    },
    viewSpec(spec) {
      this.currentViewSpec = spec
      this.showViewer = true
    }
  }
}
</script>

<style scoped>
.specs-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
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
.spec-grid-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; }
.spec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 1100px) { .spec-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .spec-grid { grid-template-columns: 1fr; } }
.spec-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; transition: all 0.18s; cursor: default; min-height: 170px; }
.spec-card:hover { border-color: var(--accent); box-shadow: 0 2px 12px rgba(88,101,242,0.08); transform: translateY(-1px); }
.spec-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.spec-card-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.spec-card-icon.frontend { background: #e8f0fe; color: #4a6cf7; }
.spec-card-icon.backend { background: #e8f5e9; color: #22c55e; }
.spec-card-icon.toolchain { background: #fff3e0; color: #f59e0b; }
.spec-card-icon.database { background: #f3e8ff; color: #7c5cf0; }
.spec-card-icon.quality { background: #fce4ec; color: #ef4444; }
.spec-card-info { flex: 1; min-width: 0; }
.spec-card-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.spec-card-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spec-card-badge { font-size: 10px; padding: 1px 7px; border-radius: 8px; font-weight: 600; flex-shrink: 0; }
.spec-card-badge.applied { background: #dcfce7; color: #16a34a; }
.spec-card-desc { font-size: 12px; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
.spec-card-tags { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; min-height: 20px; }
.spec-card-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #f5f5f7; color: var(--text-muted); font-weight: 500; }
.spec-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 12px; border-top: 1px solid #f0f0f3; }
.spec-card-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--text-muted); }
.spec-card-meta span { display: flex; align-items: center; gap: 3px; }
.spec-card-actions { display: flex; align-items: center; gap: 6px; }
.spec-action-btn { padding: 5px 13px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; border: 1px solid var(--border); background: #fff; color: var(--text-secondary); white-space: nowrap; }
.spec-action-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
.spec-action-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.spec-action-btn.primary:hover { background: #4752c4; }
.pagination-row { display: flex; align-items: center; justify-content: center; padding: 12px 20px 16px; gap: 4px; flex-shrink: 0; }
.pagination-btn { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border); background: #fff; color: var(--text-secondary); cursor: pointer; font-size: 12px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: inherit; }
.pagination-btn:hover { border-color: var(--accent); color: var(--accent); }
.pagination-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.loading-hint, .empty-hint { text-align: center; color: var(--text-muted); padding: 60px 20px; font-size: 14px; }
</style>
