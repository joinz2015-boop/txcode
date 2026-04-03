<template>
  <div class="flex-1 flex overflow-hidden bg-[#1e1e1e]">
    <div class="w-48 border-r border-border bg-sidebar shrink-0 flex flex-col">
      <div class="px-4 py-3 border-b border-border">
        <span class="text-white text-sm font-medium">类型</span>
      </div>
      <div class="flex-1 overflow-auto py-2">
        <div
          v-for="type in actionTypes"
          :key="type.value"
          class="px-4 py-2 cursor-pointer flex items-center justify-between"
          :class="currentType === type.value ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-white/5'"
          @click="selectType(type.value)"
        >
          <span class="text-sm">{{ type.label }}</span>
          <span class="text-xs opacity-60">({{ getCountByType(type.value) }})</span>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="px-4 py-3 border-b border-border bg-sidebar shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-bolt text-accent"></i>
            <span class="text-white font-medium">自定义动作</span>
            <span class="text-xs text-textMuted">({{ getTypeLabel(currentType) }})</span>
            <span class="text-xs text-textMuted">{{ filteredActions.length }} 个动作</span>
          </div>
          <button @click="openCreateDialog" class="px-3 py-1 bg-accent text-white text-xs rounded hover:bg-accent/80">
            <i class="fa-solid fa-plus mr-1"></i> 新增动作
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-sm">
          <thead class="bg-sidebar sticky top-0">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">名称</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">提示词</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">自动发送</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">排序</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-textMuted uppercase border-b border-border">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="action in filteredActions" :key="action.id" class="hover:bg-white/5">
              <td class="px-3 py-2 border-b border-border/30 text-gray-200">{{ action.name }}</td>
              <td class="px-3 py-2 border-b border-border/30 text-gray-300 max-w-[300px] truncate" :title="action.prompt">{{ action.prompt }}</td>
              <td class="px-3 py-2 border-b border-border/30">
                <span v-if="action.auto_send" class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">是</span>
                <span v-else class="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">否</span>
              </td>
              <td class="px-3 py-2 border-b border-border/30 text-gray-300">{{ action.sort_order }}</td>
              <td class="px-3 py-2 border-b border-border/30">
                <div class="flex items-center gap-2">
                  <button @click="openEditDialog(action)" class="text-xs px-2 py-1 text-blue-400 hover:bg-blue-500/20 rounded">编辑</button>
                  <button @click="deleteAction(action)" class="text-xs px-2 py-1 text-red-400 hover:bg-red-500/20 rounded">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredActions.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-textMuted">暂无动作，点击"新增动作"创建</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-sidebar border border-border rounded-lg w-[500px] max-h-[80vh] overflow-auto">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 class="text-white font-medium">{{ isEditing ? '编辑动作' : '新增动作' }}</h3>
          <button @click="closeDialog" class="text-textMuted hover:text-white text-sm">关闭</button>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <label class="block text-xs text-textMuted mb-1">类型 <span class="text-red-400">*</span></label>
            <select v-model="form.action_type" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded" :disabled="isEditing">
              <option value="design">方案设计</option>
              <option value="code">代码生成</option>
              <option value="test">测试验收</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">名称 <span class="text-red-400">*</span></label>
            <input v-model="form.name" type="text" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded" placeholder="按钮显示名称">
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">提示词 <span class="text-red-400">*</span></label>
            <textarea v-model="form.prompt" rows="4" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded resize-none" placeholder="点击按钮后填入输入框的内容"></textarea>
          </div>
          <div>
            <label class="block text-xs text-textMuted mb-1">排序</label>
            <input v-model.number="form.sort_order" type="number" class="w-full bg-black/20 border border-white/10 text-white text-sm px-3 py-2 rounded" placeholder="数字越小越靠前">
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="autoSend" v-model="form.auto_send" class="accent-accent">
            <label for="autoSend" class="text-xs text-textMuted">点击后自动发送（无需手动确认）</label>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button @click="closeDialog" class="px-4 py-1 text-textMuted text-sm rounded hover:bg-white/10">取消</button>
          <button @click="saveAction" class="px-4 py-1 bg-accent text-white text-sm rounded hover:bg-accent/80">
            {{ isEditing ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'

const ACTION_TYPE_LABELS = {
  design: '方案设计',
  code: '代码生成',
  test: '测试验收'
}

export default {
  name: 'CustomActionsView',
  data() {
    return {
      actions: [],
      currentType: 'design',
      showDialog: false,
      isEditing: false,
      currentAction: null,
      form: {
        action_type: 'design',
        name: '',
        prompt: '',
        auto_send: false,
        sort_order: 0
      },
      actionTypes: [
        { value: 'design', label: '方案设计' },
        { value: 'code', label: '代码生成' },
        { value: 'test', label: '测试验收' }
      ]
    }
  },
  computed: {
    filteredActions() {
      return this.actions.filter(a => a.action_type === this.currentType)
    }
  },
  async created() {
    await this.loadActions()
    const type = this.$route.query.type
    if (type && ['design', 'code', 'test'].includes(type)) {
      this.currentType = type
    }
  },
  methods: {
    async loadActions() {
      try {
        const res = await api.getCustomActions()
        this.actions = res.data || []
      } catch (e) {
        console.error('Load actions failed:', e)
        this.$message.error('加载动作失败')
      }
    },
    selectType(type) {
      this.currentType = type
    },
    getCountByType(type) {
      return this.actions.filter(a => a.action_type === type).length
    },
    openCreateDialog() {
      this.isEditing = false
      this.form = {
        action_type: this.currentType,
        name: '',
        prompt: '',
        auto_send: false,
        sort_order: 0
      }
      this.showDialog = true
    },
    openEditDialog(action) {
      this.isEditing = true
      this.currentAction = action
      this.form = {
        action_type: action.action_type,
        name: action.name,
        prompt: action.prompt,
        auto_send: !!action.auto_send,
        sort_order: action.sort_order || 0
      }
      this.showDialog = true
    },
    closeDialog() {
      this.showDialog = false
      this.currentAction = null
    },
    async saveAction() {
      if (!this.form.name || !this.form.prompt) {
        this.$message.error('请填写必填项')
        return
      }
      try {
        if (this.isEditing && this.currentAction) {
          await api.updateCustomAction(this.currentAction.id, this.form)
          this.$message.success('动作已更新')
        } else {
          await api.createCustomAction(this.form)
          this.$message.success('动作已创建')
        }
        this.closeDialog()
        await this.loadActions()
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    },
    async deleteAction(action) {
      if (!confirm(`确定删除动作 "${action.name}" 吗？`)) return
      try {
        await api.deleteCustomAction(action.id)
        this.$message.success('动作已删除')
        await this.loadActions()
      } catch (e) {
        this.$message.error('删除失败: ' + e.message)
      }
    },
    getTypeLabel(type) {
      const labels = { design: '方案设计', code: '代码生成', test: '测试验收' }
      return labels[type] || type
    }
  }
}
</script>