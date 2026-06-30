<template>
  <div class="spec-market flex flex-col h-full">
    <div class="flex items-center gap-2 mb-4 flex-wrap">
      <el-input
        v-model="keyword"
        placeholder="搜索规范..."
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

    <div v-else-if="displaySpecs.length === 0" class="flex-1 flex flex-col items-center justify-center text-textMuted">
      <i class="fa-solid fa-file-alt text-4xl mb-4 opacity-30"></i>
      <p>暂无规范</p>
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SpecCard
            v-for="spec in displaySpecs"
            :key="spec.id || spec.name"
            :spec="spec"
            :installed="filterMode === 'installed' ? true : isInstalled(spec.name)"
            :installing="installingIds[spec.id]"
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
import SpecCard from './SpecCard.vue'

export default {
  name: 'SpecMarket',
  components: { SpecCard },
  props: {
    localSpecs: {
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
      specs: [],
      localInstalledSpecs: [],
      total: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      installingIds: {}
    }
  },
  computed: {
    displaySpecs() {
      return this.filterMode === 'installed' ? this.localInstalledSpecs : this.specs
    }
  },
  created() {
    this.loadCategories()
    this.loadSpecs()
  },
  methods: {
    async loadCategories() {
      try {
        const res = await api.getSpecCategories()
        this.categories = res.data || []
      } catch (e) {
        console.error('Failed to load spec categories:', e)
      }
    },
    async loadSpecs() {
      this.loading = true
      try {
        const res = await api.getPublishedSpecs({
          page: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.keyword || undefined,
          categoryId: this.selectedCategoryId || undefined
        })
        const data = res.data || {}
        this.specs = data.list || []
        this.total = data.total || 0
      } catch (e) {
        console.error('Failed to load specs:', e)
        this.specs = []
      } finally {
        this.loading = false
      }
    },
    async loadLocalInstalledSpecs() {
      this.loading = true
      try {
        const res = await api.getLocalSpecs(this.projectPath)
        this.localInstalledSpecs = res.data?.specs || []
      } catch (e) {
        console.error('Failed to load local installed specs:', e)
        this.localInstalledSpecs = []
      } finally {
        this.loading = false
      }
    },
    selectFilter(mode) {
      this.filterMode = mode
      this.currentPage = 1
      this.selectedCategoryId = ''
      if (mode === 'installed') {
        this.loadLocalInstalledSpecs()
      } else {
        this.loadSpecs()
      }
    },
    selectCategory(categoryId) {
      this.selectedCategoryId = categoryId
      this.currentPage = 1
      this.filterMode = ''
      this.loadSpecs()
    },
    onSearch() {
      this.currentPage = 1
      this.loadSpecs()
    },
    handlePageChange(page) {
      this.currentPage = page
      this.loadSpecs()
    },
    isInstalled(name) {
      return this.localSpecs.some(s => s.name === name)
    },
    async handleInstall(spec) {
      try {
        await this.$confirm(`确定要安装 "${spec.name}" 吗？`, '确认', { type: 'info' })
      } catch (e) {
        return
      }
      this.$set(this.installingIds, spec.id, true)
      try {
        await api.installSpec(spec.id, spec.name)
        this.$message.success(`安装成功: ${spec.name}`)
        this.$emit('refresh-local')
      } catch (e) {
        this.$message.error('安装失败: ' + (e.message || 'Unknown error'))
      } finally {
        this.$set(this.installingIds, spec.id, false)
      }
    },
    async handleUninstall(spec) {
      try {
        await this.$confirm(`确定要卸载 "${spec.name}" 吗？`, '确认', { type: 'warning' })
        await api.uninstallSpec(spec.name)
        this.$message.success(`卸载成功: ${spec.name}`)
        this.$emit('refresh-local')
        if (this.filterMode === 'installed') {
          this.loadLocalInstalledSpecs()
        }
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('卸载失败: ' + (e.message || 'Unknown error'))
        }
      }
    },
    handleView(spec) {
      this.$emit('view', spec)
    }
  }
}
</script>
