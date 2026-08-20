<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>选择模版</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="template-search">
          <input
            ref="searchInput"
            v-model="searchText"
            placeholder="搜索模版..."
            class="search-input"
          />
        </div>
        <div class="template-list-container">
          <div v-if="loading" class="empty-state">加载中...</div>
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
      </div>
      <div class="dialog-footer">
        <span class="selected-template">{{ selectedName || '未选择' }}</span>
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="handleConfirm" :disabled="!selectedTemplate">选择</button>
      </div>
    </div>
  </div>
</template>

<script>
import { browseFilesystem } from '@/api/index'

export default {
  name: 'DesktopDesignTemplateSelectDialog',
  props: {
    basePath: { type: String, default: '.txcode/design' }
  },
  emits: ['close', 'select'],
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
  mounted() {
    this.loadTemplates()
    this.selectedTemplate = ''
    this.searchText = ''
  },
  methods: {
    async loadTemplates() {
      this.loading = true
      try {
        const templateDir = `${this.basePath}/.template`
        const res = await browseFilesystem(templateDir)
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
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: var(--shadow-lg);
  width: 460px; max-width: 90vw; max-height: 70vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 12px; }
.template-search { margin-bottom: 8px; flex-shrink: 0; }
.search-input {
  width: 100%; padding: 7px 10px; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box;
}
.search-input:focus { border-color: var(--accent); }
.template-list-container {
  flex: 1; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px;
}
.empty-state {
  padding: 30px; text-align: center; color: var(--text-muted); font-size: 12px;
}
.template-item {
  padding: 9px 12px; cursor: pointer; border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.template-item:last-child { border-bottom: none; }
.template-item:hover { background: var(--bg-hover); }
.template-item.template-selected {
  background: var(--accent-light);
  border-left: 2px solid var(--accent);
}
.template-name { color: var(--text-primary); font-size: 13px; font-weight: 500; }
.template-path { color: var(--text-muted); font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dialog-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.selected-template {
  flex: 1; padding: 6px 10px; background: var(--bg-input); color: var(--text-muted);
  font-size: 12px; border-radius: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
