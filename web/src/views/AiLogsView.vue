<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="w-[260px] bg-sidebar border-r border-border flex flex-col shrink-0">
      <div class="flex border-b border-border text-xs uppercase font-bold text-textMuted">
        <div class="px-4 py-2 border-b-2 border-accent text-white flex items-center gap-2">
          <i class="fa-solid fa-list"></i>
          日志
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto py-1">
        <div
          v-for="logType in logTypes"
          :key="logType.key"
          @click="selectLogType(logType)"
          class="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm"
          :class="selectedLogType?.key === logType.key ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i :class="logType.icon"></i>
          <span class="truncate">{{ logType.name }}</span>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div class="px-4 py-3 border-b border-border bg-sidebar">
        <div class="flex items-center gap-4 mb-3">
          <div class="flex items-center gap-2">
            <i :class="selectedLogType?.icon"></i>
            <span class="text-white font-medium">{{ selectedLogType?.name }}</span>
          </div>
          <span class="text-xs text-textMuted">{{ total }} 条记录</span>
        </div>
        
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-2">
            <label class="text-xs text-textMuted">调用类型:</label>
            <select v-model="filters.callType" @change="loadLogs" class="bg-black/20 border border-white/10 text-white text-xs px-2 py-1 rounded">
              <option value="">全部</option>
              <option value="tool_call">工具调用</option>
              <option value="normal">普通对话</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-textMuted">会话:</label>
            <select v-model="filters.sessionId" @change="loadLogs" class="bg-black/20 border border-white/10 text-white text-xs px-2 py-1 rounded">
              <option value="">全部会话</option>
              <option v-for="s in sessions" :key="s.id" :value="s.id">{{ s.title }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-textMuted">开始时间:</label>
            <input v-model="filters.startTime" type="datetime-local" @change="loadLogs" class="bg-black/20 border border-white/10 text-white text-xs px-2 py-1 rounded">
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-textMuted">结束时间:</label>
            <input v-model="filters.endTime" type="datetime-local" @change="loadLogs" class="bg-black/20 border border-white/10 text-white text-xs px-2 py-1 rounded">
          </div>
          <button @click="loadLogs" class="px-3 py-1 bg-accent text-white text-xs rounded hover:bg-accent/80">
            查询
          </button>
          <button @click="resetFilters" class="px-3 py-1 text-textMuted text-xs rounded hover:bg-white/10">
            重置
          </button>
        </div>
      </div>
      
      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-sm">
          <thead class="bg-sidebar sticky top-0">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">ID</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">时间</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">类型</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">模型</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">耗时</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">输入Token</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">输出Token</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">费用</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">会话ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-white/5">
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ log.id }}</td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ formatTime(log.request_time) }}</td>
              <td class="px-3 py-2 border-b border-border/30">
                <span class="text-xs px-2 py-0.5 rounded" :class="log.call_type === 'tool_call' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'">
                  {{ log.call_type === 'tool_call' ? '工具调用' : '普通对话' }}
                </span>
              </td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ log.model_name }}</td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ formatDuration(log.duration_ms) }}</td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ log.input_tokens || 0 }}</td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ log.output_tokens || 0 }}</td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30">${{ (log.cost || 0).toFixed(4) }}</td>
              <td class="px-3 py-2 text-gray-300 border-b border-border/30 truncate max-w-[150px]" :title="log.session_id">{{ getSessionTitle(log.session_id) }}</td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="9" class="px-3 py-8 text-center text-textMuted">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between px-4 py-2 border-t border-border bg-sidebar">
        <span class="text-xs text-textMuted">共 {{ total }} 条</span>
        <div class="flex items-center gap-2">
          <button @click="prevPage" :disabled="page <= 1" class="px-2 py-1 text-xs text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            <i class="fa-solid fa-chevron-left"></i> 上一页
          </button>
          <span class="text-xs text-textMuted">{{ page }} / {{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="page >= totalPages" class="px-2 py-1 text-xs text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            下一页 <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { api } from '../api'

const LOG_TYPES = [
  { key: 'ai_call_logs', name: 'AI 日志', icon: 'fa-solid fa-robot text-xs' },
]

export default {
  name: 'AiLogsView',
  data() {
    return {
      logTypes: LOG_TYPES,
      selectedLogType: LOG_TYPES[0],
      logs: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
      sessions: [],
      loading: false,
      filters: {
        callType: '',
        sessionId: '',
        startTime: '',
        endTime: ''
      }
    }
  },
  async created() {
    await this.loadSessions()
    await this.loadLogs()
  },
  methods: {
    async loadSessions() {
      try {
        const res = await api.getSessions(100, 0)
        this.sessions = res.data || []
      } catch (e) {
        console.error('Load sessions failed:', e)
      }
    },
    selectLogType(logType) {
      this.selectedLogType = logType
      this.resetFilters()
    },
    async loadLogs() {
      this.loading = true
      try {
        const res = await api.getAiCallLogs(this.page, this.pageSize)
        let rows = res.data.rows || []
        
        if (this.filters.callType) {
          rows = rows.filter(r => r.call_type === this.filters.callType)
        }
        if (this.filters.sessionId) {
          rows = rows.filter(r => r.session_id && r.session_id.includes(this.filters.sessionId))
        }
        if (this.filters.startTime) {
          const start = new Date(this.filters.startTime).getTime()
          rows = rows.filter(r => new Date(r.request_time).getTime() >= start)
        }
        if (this.filters.endTime) {
          const end = new Date(this.filters.endTime).getTime()
          rows = rows.filter(r => new Date(r.request_time).getTime() <= end)
        }
        
        this.logs = rows
        this.total = res.data.total
        this.totalPages = res.data.totalPages
      } catch (e) {
        console.error('Load logs failed:', e)
        this.logs = []
      } finally {
        this.loading = false
      }
    },
    resetFilters() {
      this.filters.callType = ''
      this.filters.sessionId = ''
      this.filters.startTime = ''
      this.filters.endTime = ''
      this.page = 1
      this.loadLogs()
    },
    async prevPage() {
      if (this.page > 1) {
        this.page--
        await this.loadLogs()
      }
    },
    async nextPage() {
      if (this.page < this.totalPages) {
        this.page++
        await this.loadLogs()
      }
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString('zh-CN')
    },
    getSessionTitle(sessionId) {
      if (!sessionId) return '-'
      const s = this.sessions.find(s => s.id === sessionId)
      return s ? s.title : sessionId.substring(0, 8)
    },
    formatDuration(ms) {
      if (!ms) return '0ms'
      if (ms < 1000) return `${ms}ms`
      return `${(ms / 1000).toFixed(2)}s`
    }
  }
}
</script>
