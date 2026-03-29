<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
    <div class="px-4 py-3 border-b border-border bg-sidebar shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-clock text-accent"></i>
          <span class="text-white font-medium">定时任务</span>
          <span class="text-xs text-textMuted">{{ tasks.length }} 个任务</span>
        </div>
        <button @click="openCreateDialog" class="px-3 py-1 bg-accent text-white text-xs rounded hover:bg-accent/80">
          <i class="fa-solid fa-plus mr-1"></i> 新建任务
        </button>
      </div>
    </div>
    
    <div class="flex-1 overflow-auto p-4">
      <table class="w-full text-sm">
        <thead class="bg-sidebar sticky top-0">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">状态</th>
            <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">名称</th>
            <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">模型</th>
            <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">调度</th>
            <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">技能</th>
            <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id" class="hover:bg-white/5">
            <td class="px-3 py-2 border-b border-border/30">
              <span v-if="task.enabled" class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">启用</span>
              <span v-else class="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">停用</span>
            </td>
            <td class="px-3 py-2 text-gray-200 border-b border-border/30">{{ task.name }}</td>
            <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ task.model }}</td>
            <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ formatSchedule(task.scheduleType) }}</td>
            <td class="px-3 py-2 text-gray-300 border-b border-border/30">
              <span v-if="task.skills?.length" class="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded mr-1" v-for="s in task.skills" :key="s">{{ s }}</span>
              <span v-else class="text-textMuted">-</span>
            </td>
            <td class="px-3 py-2 border-b border-border/30">
              <div class="flex items-center gap-2">
                <button v-if="!task.enabled" @click="startTask(task)" class="text-xs px-2 py-1 text-green-400 hover:bg-green-500/20 rounded">启动</button>
                <button v-else @click="stopTask(task)" class="text-xs px-2 py-1 text-yellow-400 hover:bg-yellow-500/20 rounded">停用</button>
                <button @click="runTask(task)" class="text-xs px-2 py-1 text-blue-400 hover:bg-blue-500/20 rounded">执行</button>
                <button @click="openLogDialog(task)" class="text-xs px-2 py-1 text-gray-400 hover:bg-white/10 rounded">日志</button>
                <button @click="openEditDialog(task)" class="text-xs px-2 py-1 text-gray-400 hover:bg-white/10 rounded">编辑</button>
                <button @click="deleteTask(task)" class="text-xs px-2 py-1 text-red-400 hover:bg-red-500/20 rounded">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="tasks.length === 0">
            <td colspan="6" class="px-3 py-8 text-center text-textMuted">暂无任务，点击"新建任务"创建</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-sidebar border border-border rounded-lg w-[600px] max-h-[80vh] overflow-auto">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 class="text-white font-medium">{{ isEditing ? '编辑任务' : '新建任务' }}</h3>
          <button @click="closeDialog" class="text-textMuted hover:text-white text-sm">关闭</button>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <label class="block text-xs text-textMuted mb-1">任务名称 <span class="text-red-400">*</span></label>
            <input v-model="form.name" type="text" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded" placeholder="任务名称">
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">AI 模型 <span class="text-red-400">*</span></label>
            <select v-model="form.model" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded">
              <option v-for="m in models" :key="m.id" :value="m.name">{{ m.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">调度周期 <span class="text-red-400">*</span></label>
            <select v-model="form.scheduleType" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded">
              <option value="*/5 * * * *">每5分钟</option>
              <option value="*/30 * * * *">每30分钟</option>
              <option value="0 * * * *">每小时</option>
              <option value="0 */2 * * *">每2小时</option>
              <option value="0 */12 * * *">每12小时</option>
              <option value="0 0 * * *">每天0点</option>
              <option value="0 0 1 * *">每月1日0点</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">通知方式</label>
            <select v-model="form.notifyType" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded">
              <option value="message">消息</option>
              <option value="email">邮件</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">关联技能</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="skill in availableSkills" :key="skill" class="flex items-center gap-1 text-xs text-textMuted cursor-pointer">
                <input type="checkbox" :value="skill" v-model="form.skills" class="accent-accent">
                {{ skill }}
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">任务内容 <span class="text-red-400">*</span></label>
            <textarea v-model="form.content" rows="5" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded resize-none" placeholder="请描述任务内容..."></textarea>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="taskEnabled" v-model="form.enabled" class="accent-accent">
            <label for="taskEnabled" class="text-xs text-textMuted">立即启用</label>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button @click="closeDialog" class="px-4 py-1 text-textMuted text-sm rounded hover:bg-white/10">取消</button>
          <button @click="saveTask" class="px-4 py-1 bg-accent text-white text-sm rounded hover:bg-accent/80">
            {{ isEditing ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Log Dialog -->
    <div v-if="showLogDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-sidebar border border-border rounded-lg w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <h3 class="text-white font-medium">{{ currentTask?.name }} - 执行日志</h3>
          <button @click="showLogDialog = false" class="text-textMuted hover:text-white text-sm">关闭</button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <table class="w-full text-sm">
            <thead class="bg-sidebar sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">状态</th>
                <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">时间</th>
                <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">耗时</th>
                <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" class="hover:bg-white/5">
                <td class="px-3 py-2 border-b border-border/30">
                  <span class="text-xs px-2 py-0.5 rounded" :class="log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                    {{ log.status === 'success' ? '成功' : '失败' }}
                  </span>
                </td>
                <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ formatTime(log.executedAt) }}</td>
                <td class="px-3 py-2 text-gray-300 border-b border-border/30">{{ formatDuration(log.duration) }}</td>
                <td class="px-3 py-2 text-gray-300 border-b border-border/30 truncate max-w-[400px]" :title="log.result">{{ log.result || log.error || '-' }}</td>
              </tr>
              <tr v-if="logs.length === 0">
                <td colspan="4" class="px-3 py-8 text-center text-textMuted">暂无执行记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'

const SCHEDULE_LABELS = {
  '*/5 * * * *': '每5分钟',
  '*/30 * * * *': '每30分钟',
  '0 * * * *': '每小时',
  '0 */2 * * *': '每2小时',
  '0 */12 * * *': '每12小时',
  '0 0 * * *': '每天0点',
  '0 0 1 * *': '每月1日0点',
}

export default {
  name: 'TasksView',
  data() {
    return {
      tasks: [],
      models: [],
      availableSkills: [],
      showDialog: false,
      showLogDialog: false,
      isEditing: false,
      currentTask: null,
      logs: [],
      form: {
        name: '',
        model: 'gpt-4',
        scheduleType: '0 * * * *',
        notifyType: 'message',
        skills: [],
        content: '',
        enabled: true
      }
    }
  },
  async created() {
    await this.loadTasks()
    await this.loadModels()
    await this.loadSkills()
  },
  methods: {
    async loadTasks() {
      try {
        const res = await api.getScheduledTasks()
        this.tasks = res.data || []
      } catch (e) {
        console.error('Load tasks failed:', e)
        this.$message.error('加载任务失败')
      }
    },
    async loadModels() {
      try {
        const res = await api.getModels()
        this.models = res.data || []
        if (this.models.length > 0 && !this.form.model) {
          this.form.model = this.models[0].name
        }
      } catch (e) {
        console.error('Load models failed:', e)
      }
    },
    async loadSkills() {
      try {
        const res = await api.getSkills()
        this.availableSkills = res.data?.map(s => s.name) || []
      } catch (e) {
        console.error('Load skills failed:', e)
      }
    },
    formatSchedule(type) {
      return SCHEDULE_LABELS[type] || type
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString('zh-CN')
    },
    formatDuration(ms) {
      if (!ms) return '0ms'
      if (ms < 1000) return `${ms}ms`
      return `${(ms / 1000).toFixed(2)}s`
    },
    openCreateDialog() {
      this.isEditing = false
      this.form = {
        name: '',
        model: this.models[0]?.name || 'gpt-4',
        scheduleType: '0 * * * *',
        notifyType: 'message',
        skills: [],
        content: '',
        enabled: true
      }
      this.showDialog = true
    },
    openEditDialog(task) {
      this.isEditing = true
      this.currentTask = task
      this.form = {
        name: task.name,
        model: task.model,
        scheduleType: task.scheduleType,
        notifyType: task.notifyType,
        skills: [...(task.skills || [])],
        content: task.content,
        enabled: task.enabled
      }
      this.showDialog = true
    },
    closeDialog() {
      this.showDialog = false
      this.currentTask = null
    },
    async saveTask() {
      if (!this.form.name || !this.form.content) {
        this.$message.error('请填写必填项')
        return
      }
      try {
        if (this.isEditing && this.currentTask) {
          await api.updateScheduledTask(this.currentTask.id, this.form)
          this.$message.success('任务已更新')
        } else {
          await api.createScheduledTask(this.form)
          this.$message.success('任务已创建')
        }
        this.closeDialog()
        await this.loadTasks()
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    },
    async deleteTask(task) {
      if (!confirm(`确定删除任务 "${task.name}" 吗？`)) return
      try {
        await api.deleteScheduledTask(task.id)
        this.$message.success('任务已删除')
        await this.loadTasks()
      } catch (e) {
        this.$message.error('删除失败: ' + e.message)
      }
    },
    async startTask(task) {
      try {
        await api.startScheduledTask(task.id)
        this.$message.success('任务已启动')
        await this.loadTasks()
      } catch (e) {
        this.$message.error('启动失败: ' + e.message)
      }
    },
    async stopTask(task) {
      try {
        await api.stopScheduledTask(task.id)
        this.$message.success('任务已停用')
        await this.loadTasks()
      } catch (e) {
        this.$message.error('停用失败: ' + e.message)
      }
    },
    async runTask(task) {
      try {
        await api.runTaskNow(task.id)
        this.$message.success('任务已开始执行')
      } catch (e) {
        this.$message.error('执行失败: ' + e.message)
      }
    },
    async openLogDialog(task) {
      this.currentTask = task
      this.showLogDialog = true
      try {
        const res = await api.getTaskLogs(task.id)
        this.logs = res.data || []
      } catch (e) {
        console.error('Load logs failed:', e)
        this.logs = []
      }
    }
  }
}
</script>
