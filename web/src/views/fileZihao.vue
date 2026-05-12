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
      <div class="flex-1 overflow-auto py-1"
        :class="{ 'bg-blue-900/20': localDragOver }"
        @dragover.prevent="handleLocalDragOver"
        @dragleave="handleLocalDragLeave"
        @drop="handleLocalDrop"
      >
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
        <button @click="copyLocalPath" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
          <i class="fa-solid fa-copy text-xs w-4"></i> 复制路径
        </button>
        <button v-if="localContextMenu.target?.name !== '..'" @click="showLocalRenameDialog" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
          <i class="fa-solid fa-pen text-xs w-4"></i> 重命名
        </button>
        <button v-if="localContextMenu.target?.name !== '..'" @click="deleteLocalItem" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#094771] flex items-center gap-2">
          <i class="fa-solid fa-trash text-xs w-4"></i> 删除
        </button>
        <div class="border-t border-[#3c3c3c] my-1"></div>
        <button v-if="localContextMenu.target?.name !== '..' && !localContextMenu.target?.is_directory" @click="uploadToZihao" class="w-full text-left px-4 py-2 text-sm text-[#cccccc] hover:bg-[#094771] flex items-center gap-2">
          <i class="fa-solid fa-server text-xs w-4"></i> 上传到梓豪
        </button>
      </div>
    </aside>
    <main class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div class="flex border-b border-border bg-sidebar shrink-0">
        <div class="px-4 py-2 text-xs uppercase font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-server text-accent"></i>
          梓豪远程平台
        </div>
        <div class="flex-1"></div>
        <button @click="openZihaoConfig" class="p-1 mr-2 text-textMuted hover:text-white" title="梓豪配置">
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>
      <div class="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button @click="goZihaoUp" class="p-1 text-textMuted hover:text-white" title="上级目录">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button @click="refreshZihao" class="p-1 text-textMuted hover:text-white" title="刷新">
          <i class="fa-solid fa-refresh"></i>
        </button>
        <input
          v-model="zihaoPathInput"
          @keyup.enter="navigateZihaoPath"
          placeholder="输入路径后回车跳转..."
          class="flex-1 px-2 py-1 mx-1 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-xs text-[#cccccc] focus:outline-none focus:border-[#0e639c]"
        />
      </div>
      <div
        class="flex-1 overflow-auto py-1"
        :class="{ 'bg-blue-900/20': isDragOver }"
        @dragover.prevent="handleZihaoDragOver"
        @dragleave="handleZihaoDragLeave"
        @drop="handleZihaoDrop"
      >
        <div v-if="!zihaoConfig" class="flex items-center justify-center h-full text-textMuted">
          <div class="text-center">
            <i class="fa-solid fa-server text-4xl mb-4 opacity-30"></i>
            <p class="mb-2">未配置梓豪平台</p>
            <button @click="openZihaoConfig" class="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] text-sm">
              配置梓豪
            </button>
          </div>
        </div>
        <div v-else-if="zihaoLoading" class="flex items-center justify-center py-8 text-textMuted">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
        </div>
        <div v-else-if="zihaoItems.length === 0" class="flex items-center justify-center py-8 text-textMuted text-sm">
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
              v-for="item in zihaoItems"
              :key="item.path"
              class="cursor-pointer border-b border-[#3c3c3c]/50 hover:bg-[#2a2a2a]"
              :class="{ 'bg-[#094771]': selectedZihaoPath === item.path }"
              @click="selectZihaoItem(item)"
              @dblclick="openZihaoItem(item)"
              @contextmenu.prevent="showZihaoContextMenu($event, item)"
            >
              <td class="px-3 py-1">
                <div class="flex items-center gap-2">
                  <i :class="item.type === 'folder' ? 'fa-solid fa-folder text-yellow-500' : getFileIcon(item.name)" class="text-xs text-textMuted w-4"></i>
                  <span class="text-[#cccccc] truncate" :title="item.name">{{ item.name }}</span>
                </div>
              </td>
              <td class="px-3 py-1 text-[#808080] text-xs">{{ item.type === 'folder' ? '文件夹' : '文件' }}</td>
              <td class="px-3 py-1 text-[#808080] text-xs text-right">{{ item.type === 'file' ? formatSize(item.size) : '-' }}</td>
              <td class="px-3 py-1 text-[#808080] text-xs">{{ item.modify_time || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ZihaoConfigDialog ref="zihaoConfigDialog" @success="loadZihaoConfig" />
      <ZihaoContextMenu ref="zihaoContextMenu" />
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
        <p class="text-[#cccccc] text-sm mb-3">正在 {{ uploadProgress.isDownload ? '下载' : '上传' }} {{ uploadProgress.filename }}</p>
        <div class="w-full bg-[#3c3c3c] rounded-full h-2">
          <div class="bg-[#0e639c] h-2 rounded-full transition-all" :style="{ width: uploadProgress.percent + '%' }"></div>
        </div>
        <p class="text-[#808080] text-xs mt-2 text-center">{{ uploadProgress.percent.toFixed(2) }}%</p>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'
import { zihaoApi } from '../api/zihao/zihaoApi.js'
import ZihaoConfigDialog from '../components/zihao/ZihaoConfigDialog.vue'
import ZihaoContextMenu from '../components/zihao/ZihaoContextMenu.vue'

export default {
  name: 'FileZihao',
  components: { ZihaoConfigDialog, ZihaoContextMenu },
  data() {
    return {
      localItems: [],
      localLoading: false,
      localPath: '',
      localCurrentPath: '',
      localParentPath: null,
      selectedLocalPath: null,
      localDragOver: false,
      dragFile: null,
      zihaoConfig: null,
      zihaoItems: [],
      zihaoLoading: false,
      zihaoPath: '/',
      zihaoPathInput: '/',
      selectedZihaoPath: null,
      isDragOver: false,
      localContextMenu: { visible: false, x: 0, y: 0, target: null },
      renameDialog: { visible: false, title: '', value: '', target: null, isZihao: false },
      uploadProgress: { visible: false, percent: 0, filename: '', isDownload: false }
    }
  },
  async created() {
    document.addEventListener('click', this.hideLocalContextMenu)
    await this.loadZihaoConfig()
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
        this.localCurrentPath = res.data.current_path || ''
        this.localParentPath = res.data.parent_path
        if (this.localParentPath !== undefined) {
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
      this.localContextMenu = { visible: true, x: e.pageX, y: e.pageY, target: item }
    },
    hideLocalContextMenu() { this.localContextMenu.visible = false },
    copyLocalPath() {
      this.hideLocalContextMenu()
      if (this.localContextMenu.target) {
        navigator.clipboard.writeText(this.localContextMenu.target.path).catch(() => {})
        this.$message.success('已复制路径')
      }
    },
    showLocalRenameDialog() {
      const target = this.localContextMenu.target
      if (!target || target.name === '..') return
      this.renameDialog = { visible: true, title: '重命名', value: target.name, target, isZihao: false }
      this.hideLocalContextMenu()
      this.$nextTick(() => {
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },
    async deleteLocalItem() {
      const target = this.localContextMenu.target
      if (!target || target.name === '..') return
      try {
        await this.$confirm(`确定要删除 "${target.name}" 吗？`, '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
        await api.deleteFile(target.path)
        this.$message.success('删除成功')
        this.loadLocalFiles()
      } catch (e) {
        if (e !== 'cancel') this.$message.error('删除失败: ' + e.message)
      }
      this.hideLocalContextMenu()
    },
    async uploadToZihao() {
      this.hideLocalContextMenu()
      const target = this.localContextMenu.target
      if (!target || target.is_directory || target.name === '..') return
      if (!this.zihaoConfig) {
        this.$message.warning('请先配置梓豪平台')
        return
      }
      const filename = target.name
      const targetDir = this.zihaoPath || '/'
      this.uploadProgress = { visible: true, percent: 0, filename, isDownload: false }
      try {
        const response = await fetch(`/api/filesystem/download?path=${encodeURIComponent(target.path)}`)
        if (!response.ok) throw new Error('读取文件失败')
        const blob = await response.blob()
        const file = new File([blob], filename)
        await zihaoApi.uploadWithProgress(file, filename, targetDir, (p) => {
          this.uploadProgress.percent = p
        })
        this.$message.success('上传成功')
        this.loadZihaoFiles()
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
    handleLocalDragOver(e) {
      e.preventDefault()
      this.localDragOver = true
      e.dataTransfer.dropEffect = 'copy'
    },
    handleLocalDragLeave() { this.localDragOver = false },
    async handleLocalDrop(e) {
      e.preventDefault()
      this.localDragOver = false
      const files = e.dataTransfer.files
      if (files.length === 0) return
      const uploadPath = this.localCurrentPath || this.localPath
      if (!uploadPath) { this.$message.warning('无法确定上传目录'); return }
      for (const file of files) {
        this.uploadProgress = { visible: true, percent: 0, filename: file.name, isDownload: false }
        try {
          await api.uploadFilesystemWithProgress(uploadPath, file, (p) => { this.uploadProgress.percent = p })
        } catch (err) {
          this.uploadProgress.visible = false
          this.$message.error(`上传 ${file.name} 失败: ` + err.message)
          return
        }
        this.uploadProgress.visible = false
      }
      this.$message.success(`已上传 ${files.length} 个文件`)
      this.loadLocalFiles()
    },
    async loadZihaoConfig() {
      try {
        const res = await zihaoApi.getZihaoConfig()
        this.zihaoConfig = res.data.active
        if (this.zihaoConfig) {
          await this.loadZihaoFiles()
        }
      } catch (e) {
        console.error('加载梓豪配置失败:', e)
      }
    },
    async loadZihaoFiles() {
      if (!this.zihaoConfig) return
      this.zihaoLoading = true
      try {
        const res = await zihaoApi.browse(this.zihaoPath)
        let items = res.data.items || []
        if (this.zihaoPath !== '/') {
          const parentPath = this.zihaoPath.split('/').filter(Boolean).slice(0, -1).join('/')
          items = [{ name: '..', type: 'folder', path: parentPath ? '/' + parentPath : '/', size: 0, modify_time: '' }, ...items]
        }
        this.zihaoItems = items
      } catch (e) {
        this.$message.error('加载梓豪文件失败: ' + e.message)
      } finally {
        this.zihaoLoading = false
      }
    },
    refreshZihao() { this.loadZihaoFiles() },
    navigateZihaoPath() {
      let p = this.zihaoPathInput.trim()
      if (!p) return
      if (!p.startsWith('/')) p = '/' + p
      this.zihaoPath = p
      this.zihaoPathInput = p
      this.loadZihaoFiles()
    },
    goZihaoUp() {
      if (this.zihaoPath === '/') return
      const parts = this.zihaoPath.split('/').filter(Boolean)
      parts.pop()
      this.zihaoPath = parts.length > 0 ? '/' + parts.join('/') : '/'
      this.zihaoPathInput = this.zihaoPath
      this.loadZihaoFiles()
    },
    selectZihaoItem(item) { this.selectedZihaoPath = item.path },
    openZihaoItem(item) {
      if (item.type === 'folder') {
        this.zihaoPath = item.path
        this.zihaoPathInput = item.path
        this.loadZihaoFiles()
      }
    },
    showZihaoContextMenu(e, item) {
      this.selectedZihaoPath = item.path
      this.$refs.zihaoContextMenu.show(e, item, {
        onRename: this.showZihaoRenameDialog,
        onDelete: this.handleZihaoDelete,
        onDownload: item.type === 'file' ? this.downloadZihaoToLocal : null
      })
    },
    showZihaoRenameDialog(item) {
      this.renameDialog = { visible: true, title: '重命名', value: item.name, target: item, isZihao: true }
      this.$nextTick(() => {
        this.$refs.renameInput?.focus()
        this.$refs.renameInput?.select()
      })
    },
    async handleZihaoDelete(item) {
      try {
        await this.$confirm(`确定要删除 "${item.name}" 吗？`, '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
        await zihaoApi.deleteFile(item.path, item.type)
        this.$message.success('删除成功')
        this.loadZihaoFiles()
      } catch (e) {
        if (e !== 'cancel') this.$message.error('删除失败: ' + e.message)
      }
    },
    async downloadZihaoToLocal(item) {
      const targetDir = this.localCurrentPath || this.localPath
      if (!targetDir) { this.$message.warning('请先进入一个本地文件夹'); return }
      this.uploadProgress = { visible: true, percent: 0, filename: item.name, isDownload: true }
      try {
        const sep = targetDir.endsWith('\\') || targetDir.endsWith('/') ? '' : '\\'
        const targetPath = targetDir + sep + item.name
        await zihaoApi.download(item.path, targetPath, (p) => { this.uploadProgress.percent = p })
        this.$message.success('已下载到本地: ' + targetPath)
        this.loadLocalFiles()
      } catch (e) {
        this.$message.error('下载失败: ' + e.message)
      } finally {
        this.uploadProgress.visible = false
      }
    },
    async confirmRename() {
      const { value, target, isZihao } = this.renameDialog
      if (!value.trim() || !target) { this.cancelRename(); return }
      try {
        if (isZihao) {
          await zihaoApi.rename(target.path, value.trim())
          this.$message.success('重命名成功')
          this.loadZihaoFiles()
        } else {
          await api.renameFile(target.path, value.trim())
          this.$message.success('重命名成功')
          this.loadLocalFiles()
        }
      } catch (e) {
        this.$message.error('重命名失败: ' + e.message)
      }
      this.renameDialog.visible = false
    },
    cancelRename() { this.renameDialog.visible = false },
    handleZihaoDragOver(e) {
      e.preventDefault()
      this.isDragOver = true
      e.dataTransfer.dropEffect = 'copy'
    },
    handleZihaoDragLeave() { this.isDragOver = false },
    async handleZihaoDrop(e) {
      e.preventDefault()
      this.isDragOver = false
      if (!this.dragFile || !this.zihaoConfig) {
        this.$message.warning('请先从左侧拖拽文件')
        return
      }
      const filename = this.dragFile.name
      const targetDir = this.zihaoPath || '/'
      this.uploadProgress = { visible: true, percent: 0, filename, isDownload: false }
      try {
        const response = await fetch(`/api/filesystem/download?path=${encodeURIComponent(this.dragFile.path)}`)
        if (!response.ok) throw new Error('读取文件失败')
        const blob = await response.blob()
        const file = new File([blob], filename)
        await zihaoApi.uploadWithProgress(file, filename, targetDir, (p) => { this.uploadProgress.percent = p })
        this.$message.success('上传成功')
        this.loadZihaoFiles()
      } catch (e) {
        this.$message.error('上传失败: ' + e.message)
      } finally {
        this.uploadProgress.visible = false
        this.dragFile = null
      }
    },
    openZihaoConfig() { this.$refs.zihaoConfigDialog.open(this.zihaoConfig) },
    formatSize(size) {
      if (!size) return '-'
      const units = ['B', 'KB', 'MB', 'GB']
      let i = 0, s = size
      while (s >= 1024 && i < units.length - 1) { s /= 1024; i++ }
      return `${s.toFixed(1)}${units[i]}`
    },
    getFileIcon(filename) {
      const ext = filename.split('.').pop()?.toLowerCase()
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
