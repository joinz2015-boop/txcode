<template>
  <div class="oss-file-list flex-1 flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-3 py-2 bg-sidebar border-b border-border">
      <div class="flex items-center gap-2">
        <span class="text-textMuted text-xs">当前路径:</span>
        <span class="text-white text-xs">{{ displayPath }}</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="goUp"
          :disabled="!currentPrefix"
          class="p-1 text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="上级目录"
        >
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button @click="refresh" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="flex items-center justify-center py-8 text-textMuted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
      <div v-else-if="items.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
        此目录为空
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-sidebar sticky top-0">
          <tr class="text-textMuted text-xs border-b border-border">
            <th class="text-left px-3 py-2 w-1/2">名称</th>
            <th class="text-left px-3 py-2 w-20">类型</th>
            <th class="text-right px-3 py-2 w-24">大小</th>
            <th class="text-left px-3 py-2 w-36">修改时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.path"
            class="hover:bg-active cursor-pointer border-b border-border/50"
            :class="{ 'bg-active': selectedPath === item.path }"
            @click="handleSelect(item)"
            @dblclick="handleDoubleClick(item)"
            @contextmenu.prevent="handleContextMenu($event, item)"
          >
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <i :class="item.type === 'folder' ? 'fa-solid fa-folder text-yellow-500' : 'fa-solid fa-file text-gray-400'"></i>
                <span class="text-textMain">{{ item.name }}</span>
              </div>
            </td>
            <td class="px-3 py-2 text-textMuted">{{ item.type === 'folder' ? '文件夹' : '文件' }}</td>
            <td class="px-3 py-2 text-textMuted text-right">{{ item.type === 'file' ? formatSize(item.size) : '-' }}</td>
            <td class="px-3 py-2 text-textMuted">{{ item.modified ? formatDate(item.modified) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <OssContextMenu ref="contextMenu" />

    <div
      v-show="renameDialog.visible"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelRename"
    >
      <div class="bg-sidebar border border-border rounded p-4 w-80">
        <p class="text-white text-sm mb-3">重命名</p>
        <input
          ref="renameInput"
          v-model="renameDialog.value"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          class="w-full px-3 py-2 bg-[#1e1e1e] border border-border rounded text-white text-sm focus:outline-none focus:border-accent"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button @click="cancelRename" class="px-3 py-1 text-xs text-textMuted hover:text-white">取消</button>
          <button @click="confirmRename" class="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-blue-600">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ossApi } from '../../api/oss/ossApi.js'
import OssContextMenu from './OssContextMenu.vue'

export default {
  name: 'OssFileList',
  components: { OssContextMenu },
  props: {
    prefix: {
      type: String,
      default: ''
    },
    bucket: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      items: [],
      loading: false,
      selectedPath: null,
      currentPrefix: '',
      renameDialog: {
        visible: false,
        value: '',
        target: null
      }
    }
  },
  computed: {
    displayPath() {
      return this.currentPrefix ? `oss://${this.bucket}/${this.currentPrefix}` : `oss://${this.bucket}/`
    }
  },
  watch: {
    prefix: {
      immediate: true,
      handler(val) {
        this.currentPrefix = val
        this.loadItems()
      }
    }
  },
  methods: {
    async loadItems() {
      this.loading = true
      try {
        const res = await ossApi.ossBrowse(this.currentPrefix)
        this.items = res.data.items || []
      } catch (e) {
        this.$message.error('加载失败: ' + e.message)
        this.items = []
      } finally {
        this.loading = false
      }
    },
    goUp() {
      if (!this.currentPrefix) return
      const parts = this.currentPrefix.split('/').filter(Boolean)
      parts.pop()
      this.currentPrefix = parts.join('/')
      if (this.currentPrefix) {
        this.currentPrefix += '/'
      }
      this.$emit('path-change', this.currentPrefix)
    },
    refresh() {
      this.loadItems()
    },
    handleSelect(item) {
      this.selectedPath = item.path
      this.$emit('select', item)
    },
    handleDoubleClick(item) {
      if (item.type === 'folder') {
        this.currentPrefix = item.path
        this.$emit('path-change', item.path)
      }
    },
    handleContextMenu(e, item) {
      this.selectedPath = item.path
      this.$refs.contextMenu.show(e, item, {
        onRename: this.showRenameDialog,
        onDelete: this.handleDelete
      })
    },
    showRenameDialog(item) {
      this.renameDialog = {
        visible: true,
        value: item.name,
        target: item
      }
      this.$nextTick(() => {
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },
    async confirmRename() {
      const { value, target } = this.renameDialog
      if (!value.trim() || !target) {
        this.cancelRename()
        return
      }

      try {
        const oldPath = target.path
        const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1)
        const newPath = parentPath + value.trim()
        await ossApi.ossRename(oldPath, newPath)
        this.$message.success('重命名成功')
        this.loadItems()
      } catch (e) {
        this.$message.error('重命名失败: ' + e.message)
      }

      this.renameDialog.visible = false
    },
    cancelRename() {
      this.renameDialog.visible = false
    },
    async handleDelete(item) {
      try {
        await this.$confirm(`确定要删除 "${item.name}" 吗？`, '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await ossApi.ossDelete(item.path)
        this.$message.success('删除成功')
        this.loadItems()
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error('删除失败: ' + e.message)
        }
      }
    },
    formatSize(size) {
      if (!size) return '-'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let i = 0
      let s = size
      while (s >= 1024 && i < units.length - 1) {
        s /= 1024
        i++
      }
      return `${s.toFixed(1)} ${units[i]}`
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.oss-file-list >>> .el-dialog__body {
  padding: 0;
}
</style>