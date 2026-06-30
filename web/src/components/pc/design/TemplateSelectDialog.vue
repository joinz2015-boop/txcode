<template>
  <el-dialog
    :visible="visible"
    title="选择模版"
    width="420px"
    :close-on-click-modal="false"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <div class="template-select-content">
      <div class="template-search">
        <input
          ref="searchInput"
          v-model="searchText"
          placeholder="搜索模版..."
          class="search-input"
        />
      </div>
      <div class="template-list-container">
        <div v-if="loading" class="empty-state">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="filteredTemplates.length === 0" class="empty-state">
          {{ searchText ? '无匹配模版' : '暂无模版，请先保存模版' }}
        </div>
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.path"
          class="template-item"
          :class="{ 'template-selected': selectedTemplate === tpl.path }"
          @click="selectedTemplate = tpl.path"
          @dblclick="handleConfirm"
        >
          <div class="template-name">{{ tpl.name }}</div>
          <div class="template-path">{{ tpl.path }}</div>
        </div>
      </div>
      <div class="template-select-footer">
        <span class="selected-template">{{ selectedName || '未选择' }}</span>
        <button
          class="confirm-btn"
          :disabled="!selectedTemplate"
          @click="handleConfirm"
        >选择</button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { api } from '../../../api/index.js'

export default {
  name: 'TemplateSelectDialog',
  props: {
    visible: { type: Boolean, default: false },
    basePath: { type: String, default: '.txcode/design' }
  },
  data() {
    return {
      loading: false,
      templates: [],
      selectedTemplate: '',
      searchText: ''
    }
  },
  computed: {
    filteredTemplates() {
      if (!this.searchText) return this.templates
      const q = this.searchText.toLowerCase()
      return this.templates.filter(t => t.name.toLowerCase().includes(q))
    },
    selectedName() {
      const tpl = this.templates.find(t => t.path === this.selectedTemplate)
      return tpl ? tpl.name : ''
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadTemplates()
        this.selectedTemplate = ''
        this.searchText = ''
      }
    }
  },
  methods: {
    async loadTemplates() {
      this.loading = true
      try {
        const templateDir = `${this.basePath}/.template`
        const res = await api.browseFilesystem(templateDir)
        const items = res.data?.items || []
        this.templates = items
          .filter(item => !item.is_directory && item.name.endsWith('.html'))
          .map(item => ({
            name: item.name,
            path: item.path
          }))
      } catch (e) {
        console.error('Load templates failed:', e)
        this.templates = []
      } finally {
        this.loading = false
        this.$nextTick(() => {
          const input = this.$refs.searchInput
          if (input) input.focus()
        })
      }
    },
    handleConfirm() {
      if (!this.selectedTemplate) return
      this.$emit('select', this.selectedTemplate)
      this.$emit('update:visible', false)
    },
    handleClose() {
      this.$emit('close')
    },
    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    }
  }
}
</script>

<style scoped>
.template-select-content { height: 360px; display: flex; flex-direction: column; }
.template-search { margin-bottom: 10px; }
.search-input { width: 100%; padding: 8px 12px; background: #27272a; border: 1px solid #3f3f46; border-radius: 4px; color: #d4d4d8; font-size: 13px; outline: none; box-sizing: border-box; }
.search-input:focus { border-color: #3b82f6; }
.template-list-container { flex: 1; overflow-y: auto; border: 1px solid #3f3f46; border-radius: 4px; }
.empty-state { padding: 30px; text-align: center; color: #71717a; font-size: 13px; }
.template-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #27272a; }
.template-item:hover { background: #27272a; }
.template-item.template-selected { background: #1e3a5f; border-left: 2px solid #3b82f6; }
.template-name { color: #d4d4d8; font-size: 13px; font-weight: 500; }
.template-path { color: #71717a; font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.template-select-footer { margin-top: 10px; display: flex; gap: 8px; align-items: center; }
.selected-template { flex: 1; padding: 8px 12px; background: #27272a; color: #a1a1aa; font-size: 13px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.confirm-btn { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 4px; color: white; font-size: 13px; cursor: pointer; }
.confirm-btn:hover { background: #2563eb; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

:deep(.el-dialog) { background: #18181b; border: 1px solid #3f3f46; }
:deep(.el-dialog__header) { background: #18181b; border-bottom: 1px solid #3f3f46; padding: 16px 20px; }
:deep(.el-dialog__title) { color: #d4d4d8; font-size: 15px; font-weight: 500; }
:deep(.el-dialog__headerbtn) { top: 16px; right: 16px; }
:deep(.el-dialog__headerbtn .el-dialog__close) { color: #71717a; }
:deep(.el-dialog__headerbtn:hover .el-dialog__close) { color: #fff; }
:deep(.el-dialog__body) { background: #18181b; padding: 20px; color: #d4d4d8; }
</style>
