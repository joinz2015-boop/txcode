<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="bg-sidebar border-r border-border flex flex-col shrink-0" style="width: 50%">
      <div class="flex border-b border-border">
        <div class="px-4 py-2 text-xs uppercase font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-folder-open text-accent"></i>
          本地文件
        </div>
      </div>
      
      <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button @click="goLocalUp" class="p-1 text-textMuted hover:text-white" title="上级目录">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button @click="refreshLocal" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
        <button @click="goLocalHome" class="p-1 text-textMuted hover:text-white" title="我的电脑">
          <i class="fa-solid fa-home"></i>
        </button>
      </div>

      <div class="flex-1 overflow-auto py-1">
        <div v-if="localLoading" class="flex items-center justify-center py-8 text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="localItems.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
          此目录为空
        </div>
        <table v-else class="w-full text-sm">
          <thead class="sticky top-0 bg-[#252526] z-10">
            <tr class="text-textMuted text-xs border-b border-[#3c3c3c]">
              <th class="text-left px-3 py-1 font-medium">名称</th>
              <th class="text-left px-3 py-1 w-16 font-medium">类型</th>
              <th class="text-right px-3 py-1 w-20 font-medium">大小</th>
              <th class="text-left px-3 py-1 w-32 font-medium">修改时间</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in localItems"
              :key="item.path"
              class="cursor-pointer border-b border-[#3c3c3c]/50 hover:bg-[#2a2a2a]"
              :class="{ 'bg-[#094771]': selectedLocalPath === item.path }"
              :draggable="!item.is_directory"
              @click="selectLocalItem(item)"
              @dblclick="openLocalItem(item)"
              @contextmenu.prevent="showLocalContextMenu($event, item)"
              @dragstart="handleLocalDragStart($event, item)"
            >
              <td class="px-3 py-1">
                <div class="flex items-center gap-2">
                  <i :class="item.is_directory ? 'fa-solid fa-folder text-yellow-500' : getFileIcon(item.name)" class="text-xs text-textMuted w-4"></i>
                  <span class="text-[#cccccc] truncate" :title="item.name">{{ item.name }}</span>
                </div>
              </td>
              <td class="px-3 py-1 text-[#808080] text-xs">{{ item.is_directory ? '文件夹' : '文件' }}</td>
              <td class="px-3 py-1 text-[#808080] text-xs text-right">{{ item.is_directory ? '-' : formatSize(item.size) }}</td>
              <td class="px-3 py-1 text-[#808080] text-xs">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-show="localContextMenu.visible"
        class="fixed bg-[#252526] border border-[#3c3c3c] rounded shadow-lg py-1 z-50 min-w-[160px]"
        :style="{ left: localContextMenu.x + 'px', top: localContextMenu.y + 'px' }"
      >
        <template v-if="localContextMenu.target">
          <button @click="copyLocalPath" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
            <i class="fa-solid fa-copy text-xs w-4"></i> 复制路径
          </button>
          <button v-if="!localContextMenu.target.is_directory" @click="uploadToOss" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
            <i class="fa-solid fa-cloud-arrow-up text-xs w-4"></i> 上传到OSS
          </button>
        </template>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div class="flex border-b border-border bg-sidebar shrink-0">
        <div class="px-4 py-2 text-xs uppercase font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-cloud text-accent"></i>
          OSS 对象存储
        </div>
        <div class="flex-1"></div>
        <button @click="openOssConfig" class="p-1 mr-2 text-textMuted hover:text-white" title="OSS配置">
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>

      <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button @click="goOssUp" class="p-1 text-textMuted hover:text-white" title="上级目录">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button @click="refreshOss" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
      </div>

      <div
        class="flex-1 overflow-auto py-1"
        :class="{ 'bg-blue-900/20': isDragOver }"
        @dragover.prevent="handleOssDragOver"
        @dragleave="handleOssDragLeave"
        @drop="handleOssDrop"
      >
        <div v-if="!ossConfig" class="flex items-center justify-center h-full text-textMuted">
          <div class="text-center">
            <i class="fa-solid fa-cloud-arrow-up text-4xl mb-4 opacity-30"></i>
            <p class="mb-2">未配置OSS</p>
            <button @click="openOssConfig" class="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] text-sm">
              配置OSS
            </button>
          </div>
        </div>
        <div v-else-if="ossLoading" class="flex items-center justify-center py-8 text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="ossItems.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
          此目录为空
        </div>
        <table v-else class="w-full text-sm">
          <thead class="sticky top-0 bg-[#252526] z-10">
            <tr class="text-textMuted text-xs border-b border-[#3c3c3c]">
              <th class="text-left px-3 py-1 font-medium">名称</th>
              <th class="text-left px-3 py-1 w-16 font-medium">类型</th>
              <th class="text-right px-3 py-1 w-20 font-medium">大小</th>
              <th class="text-left px-3 py-1 w-32 font-medium">修改时间</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in ossItems"
              :key="item.path"
              class="cursor-pointer border-b border-[#3c3c3c]/50 hover:bg-[#2a2a2a]"
              :class="{ 'bg-[#094771]': selectedOssPath === item.path }"
              @click="selectOssItem(item)"
              @dblclick="openOssItem(item)"
              @contextmenu.prevent="showOssContextMenu($event, item)"
            >
              <td class="px-3 py-1">
                <div class="flex items-center gap-2">
                  <i :class="item.type === 'folder' ? 'fa-solid fa-folder text-yellow-500' : getFileIcon(item.name)" class="text-xs text-textMuted w-4"></i>
                  <span class="text-[#cccccc] truncate" :title="item.name">{{ item.name }}</span>
                </div>
              </td>
              <td class="px-3 py-1 text-[#808080] text-xs">{{ item.type === 'folder' ? '文件夹' : '文件' }}</td>
              <td class="px-3 py-1 text-[#808080] text-xs text-right">{{ item.type === 'file' ? formatSize(item.size) : '-' }}</td>
              <td class="px-3 py-1 text-[#808080] text-xs">{{ item.modified ? formatDate(item.modified) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <OssConfigDialog ref="ossConfigDialog" @success="loadOssConfig" />
      <OssContextMenu ref="ossContextMenu" />
    </main>

    <div
      v-show="renameDialog.visible"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelRename"
    >
      <div class="bg-[#252526] border border-[#3c3c3c] rounded p-4 w-80">
        <p class="text-[#cccccc] text-sm mb-3">{{ renameDialog.title }}</p>
        <input
          ref="renameInput"
          v-model="renameDialog.value"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          class="w-full px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-[#cccccc] text-sm focus:outline-none focus:border-[#0e639c]"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button @click="cancelRename" class="px-3 py-1 text-xs text-[#808080] hover:text-white">取消</button>
          <button @click="confirmRename" class="px-3 py-1 text-xs bg-[#0e639c] text-white rounded hover:bg-[#1177bb]">确定</button>
        </div>
      </div>
    </div>

    <div v-if="uploadProgress.visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[#252526] border border-[#3c3c3c] rounded p-4 w-80">
        <p class="text-[#cccccc] text-sm mb-3">正在上传 {{ uploadProgress.filename }}</p>
        <div class="w-full bg-[#3c3c3c] rounded-full h-2">
          <div class="bg-[#0e639c] h-2 rounded-full transition-all" :style="{ width: uploadProgress.percent + '%' }"></div>
        </div>
        <p class="text-[#808080] text-xs mt-2 text-center">{{ uploadProgress.percent }}%</p>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'
import { ossApi } from '../api/oss/ossApi.js'
import OssConfigDialog from '../components/oss/OssConfigDialog.vue'
import OssContextMenu from '../components/oss/OssContextMenu.vue'

export default {
  name: 'FileOss',
  components: { OssConfigDialog, OssContextMenu },
  data() {
    return {
      localItems: [],
      localLoading: false,
      localPath: '',
      localParentPath: null,
      selectedLocalPath: null,

      ossConfig: null,
      ossItems: [],
      ossLoading: false,
      ossPrefix: '',
      selectedOssPath: null,

      isDragOver: false,
      dragFile: null,

      localContextMenu: { visible: false, x: 0, y: 0, target: null },

      renameDialog: { visible: false, title: '', value: '', target: null },

      uploadProgress: { visible: false, percent: 0, filename: '' }
    }
  },
  async created() {
    document.addEventListener('click', this.hideLocalContextMenu)
    await this.loadOssConfig()
    await this.loadLocalFiles()
  },
  beforeDestroy() {
    document.removeEventListener('click', this.hideLocalContextMenu)
  },
  methods: {
    async loadLocalFiles() {
      this.localLoading = true
      try {
        const res = await api.browseFilesystem(this.localPath)
        let items = res.data.items || []
        this.localParentPath = res.data.parent_path
        if (this.localParentPath || this.localParentPath === '') {
          items = [{ name: '..', is_directory: true, path: this.localParentPath || '', size: 0 }, ...items]
        }
        this.localItems = items.sort((a, b) => {
          if (a.name === '..') return -1
          if (b.name === '..') return 1
          if (a.is_directory === b.is_directory) return a.name.localeCompare(b.name)
          return a.is_directory ? -1 : 1
        })
      } catch (e) {
        console.error('加载本地文件失败:', e)
      } finally {
        this.localLoading = false
      }
    },

    async loadOssConfig() {
      try {
        const res = await ossApi.getOssConfig()
        this.ossConfig = res.data.active
        if (this.ossConfig) {
          await this.loadOssFiles()
        }
      } catch (e) {
        console.error('加载OSS配置失败:', e)
      }
    },

    async loadOssFiles() {
      if (!this.ossConfig) return
      this.ossLoading = true
      try {
        const res = await ossApi.ossBrowse(this.ossPrefix)
        let items = res.data.items || []
        if (this.ossPrefix) {
          items = [{ name: '..', type: 'folder', path: '', size: 0, modified: null }, ...items]
        }
        this.ossItems = items
      } catch (e) {
        this.$message.error('加载OSS文件失败: ' + e.message)
      } finally {
        this.ossLoading = false
      }
    },

    refreshLocal() { this.loadLocalFiles() },
    goLocalUp() {
      if (this.localParentPath === null) return
      this.localPath = this.localParentPath === '' ? '' : this.localParentPath
      this.loadLocalFiles()
    },
    goLocalHome() {
      this.localPath = ''
      this.loadLocalFiles()
    },
    selectLocalItem(item) { this.selectedLocalPath = item.path },
    openLocalItem(item) {
      if (item.name === '..') {
        this.localPath = item.path === '' ? '' : item.path
        this.loadLocalFiles()
      } else if (item.is_directory) {
        this.localPath = item.path
        this.loadLocalFiles()
      }
    },
    showLocalContextMenu(e, item) {
      e.preventDefault()
      this.localContextMenu = { visible: true, x: e.pageX, y: e.pageY, target: item }
    },
    hideLocalContextMenu() { this.localContextMenu.visible = false },
    copyLocalPath() {
      this.hideLocalContextMenu()
      if (this.localContextMenu.target) {
        navigator.clipboard.writeText(this.localContextMenu.target.path)
        this.$message.success('路径已复制')
      }
    },
    async uploadToOss() {
      this.hideLocalContextMenu()
      const target = this.localContextMenu.target
      if (!target || target.is_directory) return
      const filename = target.name
      const ossKey = this.ossPrefix ? this.ossPrefix.replace(/\/$/, '') + '/' + filename : filename
      this.uploadProgress = { visible: true, percent: 0, filename }
      try {
        await ossApi.ossUpload(target.path, ossKey)
        this.$message.success('上传成功')
        this.loadOssFiles()
      } catch (e) {
        this.$message.error('上传失败: ' + e.message)
      } finally {
        this.uploadProgress.visible = false
      }
    },
    handleLocalDragStart(e, item) {
      if (item.is_directory) { e.preventDefault(); return }
      this.dragFile = item
      e.dataTransfer.effectAllowed = 'copy'
    },

    handleOssDragOver(e) {
      e.preventDefault()
      this.isDragOver = true
      e.dataTransfer.dropEffect = 'copy'
    },
    handleOssDragLeave() { this.isDragOver = false },
    async handleOssDrop(e) {
      e.preventDefault()
      this.isDragOver = false
      if (!this.dragFile || !this.ossConfig) {
        this.$message.warning('请先选择要上传的文件')
        return
      }
      const filename = this.dragFile.name
      const ossKey = this.ossPrefix ? this.ossPrefix.replace(/\/$/, '') + '/' + filename : filename
      this.uploadProgress = { visible: true, percent: 0, filename }
      try {
        await ossApi.ossUpload(this.dragFile.path, ossKey)
        this.$message.success('上传成功')
        this.loadOssFiles()
      } catch (e) {
        this.$message.error('上传失败: ' + e.message)
      } finally {
        this.uploadProgress.visible = false
        this.dragFile = null
      }
    },

    refreshOss() { this.loadOssFiles() },
    goOssUp() {
      if (!this.ossPrefix) return
      const parts = this.ossPrefix.split('/').filter(Boolean)
      parts.pop()
      this.ossPrefix = parts.join('/')
      if (this.ossPrefix) this.ossPrefix += '/'
      else this.ossPrefix = ''
      this.loadOssFiles()
    },
    selectOssItem(item) { this.selectedOssPath = item.path },
    openOssItem(item) {
      if (item.type === 'folder') {
        this.ossPrefix = item.path
        this.loadOssFiles()
      }
    },
    showOssContextMenu(e, item) {
      this.selectedOssPath = item.path
      this.$refs.ossContextMenu.show(e, item, {
        onRename: this.showRenameDialog,
        onDelete: this.handleOssDelete
      })
    },
    showRenameDialog(item) {
      this.renameDialog = { visible: true, title: '重命名', value: item.name, target: item }
      this.$nextTick(() => {
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },
    async confirmRename() {
      const { value, target } = this.renameDialog
      if (!value.trim() || !target) { this.cancelRename(); return }
      try {
        const parentPath = target.path.substring(0, target.path.lastIndexOf('/') + 1)
        const newPath = parentPath + value.trim()
        await ossApi.ossRename(target.path, newPath)
        this.$message.success('重命名成功')
        this.loadOssFiles()
      } catch (e) {
        this.$message.error('重命名失败: ' + e.message)
      }
      this.renameDialog.visible = false
    },
    cancelRename() { this.renameDialog.visible = false },
    async handleOssDelete(item) {
      try {
        await this.$confirm(`确定要删除 "${item.name}" 吗？`, '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await ossApi.ossDelete(item.path)
        this.$message.success('删除成功')
        this.loadOssFiles()
      } catch (e) {
        if (e !== 'cancel') this.$message.error('删除失败: ' + e.message)
      }
    },
    openOssConfig() { this.$refs.ossConfigDialog.open(this.ossConfig) },

    formatSize(size) {
      if (!size) return '-'
      const units = ['B', 'KB', 'MB', 'GB']
      let i = 0, s = size
      while (s >= 1024 && i < units.length - 1) { s /= 1024; i++ }
      return `${s.toFixed(1)}${units[i]}`
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    getFileIcon(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const icons = {
        js: 'fa-brands fa-js text-yellow-400',
        ts: 'fa-brands fa-js text-blue-400',
        html: 'fa-brands fa-html5 text-orange-500',
        css: 'fa-brands fa-css3 text-blue-400',
        json: 'fa-solid fa-file-code text-yellow-300',
        md: 'fa-solid fa-file-lines text-gray-400',
        py: 'fa-brands fa-python text-blue-500',
        vue: 'fa-brands fa-vuejs text-green-400',
        png: 'fa-solid fa-image text-purple-400',
        jpg: 'fa-solid fa-image text-purple-400',
        pdf: 'fa-solid fa-file-pdf text-red-400'
      }
      return icons[ext] || 'fa-solid fa-file text-gray-400'
    }
  }
}
</script>