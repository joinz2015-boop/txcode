<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="cancel">
    <div class="bg-sidebar border border-border rounded p-5 w-96">
      <p class="text-white text-sm font-medium mb-4">新建网页</p>

      <div class="mb-3">
        <label class="text-textMuted text-xs block mb-1">名称</label>
        <input
          ref="nameInput"
          v-model="pageName"
          @keyup.enter="confirm"
          @keyup.escape="cancel"
          class="w-full px-3 py-2 bg-[#1e1e1e] border border-border rounded text-white text-sm focus:outline-none focus:border-accent"
          placeholder="输入网页名称"
        />
      </div>

      <div class="mb-3">
        <label class="text-textMuted text-xs block mb-2">类型</label>
        <div class="flex gap-2">
          <label
            v-for="dt in deviceTypes"
            :key="dt.value"
            class="flex items-center gap-1 px-3 py-2 rounded border text-sm cursor-pointer transition-colors"
            :class="pageType === dt.value ? 'border-accent bg-accent/10 text-white' : 'border-border text-textMuted hover:border-gray-500'"
          >
            <input type="radio" v-model="pageType" :value="dt.value" class="hidden" />
            <i :class="dt.icon" class="text-xs"></i>
            {{ dt.label }}
          </label>
        </div>
      </div>

      <div class="mb-4 p-3 bg-[#1e1e1e] rounded border border-border">
        <p class="text-xs text-textMuted mb-1">文件名预览</p>
        <p class="text-xs text-textMain font-mono">{{ previewFilename }}</p>
      </div>

      <div class="flex justify-end gap-2">
        <button @click="cancel" class="px-3 py-1 text-xs text-textMuted hover:text-white">取消</button>
        <button
          @click="confirm"
          :disabled="!pageName.trim()"
          class="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >确定</button>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../../api/index.js'

export default {
  name: 'CreatePageDialog',
  props: {
    visible: { type: Boolean, default: false },
    targetPath: { type: String, default: '' }
  },
  data() {
    return {
      pageName: '',
      pageType: 'web',
      deviceTypes: [
        { value: 'app', label: 'App', icon: 'fa-solid fa-mobile-screen' },
        { value: 'web', label: 'Web', icon: 'fa-solid fa-desktop' },
        { value: 'pad', label: 'Pad', icon: 'fa-solid fa-tablet-screen-button' }
      ]
    }
  },
  computed: {
    previewFilename() {
      const name = this.pageName.trim() || 'untitled'
      return `${name}_${this.pageType}.html`
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.pageName = ''
        this.pageType = 'web'
        this.$nextTick(() => this.$refs.nameInput?.focus())
      }
    }
  },
  methods: {
    async confirm() {
      const name = this.pageName.trim()
      if (!name) return
      const filename = `${name}_${this.pageType}.html`
      const separator = this.targetPath.includes('\\') ? '\\' : '/'
      const filePath = this.targetPath + separator + filename

      const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 20px; }
  </style>
</head>
<body>
  <h1>${name}</h1>
</body>
</html>`

      try {
        await api.writeFile(filePath, template)
        this.$message.success('网页创建成功')
        this.$emit('created')
        this.$emit('update:visible', false)
      } catch (e) {
        console.error('Create page failed:', e)
        this.$message.error('创建网页失败: ' + (e.message || '未知错误'))
      }
    },
    cancel() {
      this.$emit('update:visible', false)
    }
  }
}
</script>
