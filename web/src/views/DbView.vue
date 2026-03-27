<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="w-[260px] bg-sidebar border-r border-border flex flex-col shrink-0">
      <div class="flex border-b border-border text-xs uppercase font-bold text-textMuted">
        <div class="px-4 py-2 border-b-2 border-accent text-white flex items-center gap-2">
          <i class="fa-solid fa-database"></i>
          Tables
        </div>
      </div>
      
      <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button @click="loadTables" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto py-1">
        <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="tables.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
          暂无表
        </div>
        <div v-else>
          <div
            v-for="table in tables"
            :key="table"
            @click="selectTable(table)"
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm"
            :class="selectedTable === table ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
          >
            <i class="fa-solid fa-table text-textMuted text-xs"></i>
            <span class="truncate">{{ table }}</span>
          </div>
        </div>
      </div>

    
    </aside>

    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div v-if="!selectedTable" class="flex-1 flex items-center justify-center text-textMuted">
        <div class="text-center">
          <i class="fa-solid fa-database text-6xl mb-4 opacity-20"></i>
          <p>选择表查看数据</p>
        </div>
      </div>
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-sidebar">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-table text-textMuted"></i>
            <span class="text-sm text-white">{{ selectedTable }}</span>
            <span class="text-xs text-textMuted">({{ tableInfo.row_count || 0 }} 行)</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="prevPage" :disabled="page <= 1" class="px-2 py-1 text-xs text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="text-xs text-textMuted">{{ page }} / {{ totalPages || 1 }}</span>
            <button @click="nextPage" :disabled="page >= totalPages" class="px-2 py-1 text-xs text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
        
        <div class="flex-1 overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-sidebar sticky top-0">
              <tr>
                <th v-for="col in tableInfo.columns" :key="col.name" class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">
                  {{ col.name }}
                  <span class="text-xs font-normal text-textMuted opacity-60 ml-1">{{ col.type }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in tableData.rows" :key="idx" class="hover:bg-white/5">
                <td v-for="col in tableInfo.columns" :key="col.name" class="px-3 py-1.5 text-gray-300 border-b border-border/30">
                  {{ formatCell(row[col.name]) }}
                </td>
              </tr>
              <tr v-if="tableData.rows && tableData.rows.length === 0">
                <td :colspan="tableInfo.columns ? tableInfo.columns.length : 0" class="px-3 py-8 text-center text-textMuted">
                  表中无数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'DbView',
  data() {
    return {
      tables: [],
      selectedTable: null,
      tableInfo: {},
      tableData: { columns: [], rows: [] },
      page: 1,
      pageSize: 50,
      totalPages: 1,
      loading: false
    }
  },
  async created() {
    await this.loadTables()
  },
  methods: {
    async loadTables() {
      this.loading = true
      try {
        const res = await api.getDbTables()
        this.tables = res.tables || []
      } catch (e) {
        console.error('Load tables failed:', e)
        this.tables = []
      } finally {
        this.loading = false
      }
    },
    async selectTable(table) {
      this.selectedTable = table
      this.page = 1
      await this.loadTableInfo()
      await this.loadTableData()
    },
    async loadTableInfo() {
      if (!this.selectedTable) return
      try {
        this.tableInfo = await api.getTableInfo(this.selectedTable)
        this.totalPages = Math.max(1, Math.ceil((this.tableInfo.row_count || 0) / this.pageSize))
      } catch (e) {
        console.error('Load table info failed:', e)
        this.tableInfo = {}
      }
    },
    async loadTableData() {
      if (!this.selectedTable) return
      try {
        this.tableData = await api.getTableData(this.selectedTable, this.page, this.pageSize)
      } catch (e) {
        console.error('Load table data failed:', e)
        this.tableData = { columns: [], rows: [] }
      }
    },
    async prevPage() {
      if (this.page > 1) {
        this.page--
        await this.loadTableData()
      }
    },
    async nextPage() {
      if (this.page < this.totalPages) {
        this.page++
        await this.loadTableData()
      }
    },
    formatCell(value) {
      if (value === null) return '<null>'
      if (value === undefined) return ''
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }
  }
}
</script>
