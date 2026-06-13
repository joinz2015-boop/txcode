import { uploadSingleMedia } from '../api/chat/media.js'

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 1 * 1024 * 1024

export function mediaChatMixin() {
  return {
    data: () => ({
      mediaFiles: [],
      previewImage: null
    }),
    methods: {
      async _uploadFiles(files) {
        const currentCount = (this.mediaFiles || []).length
        const remaining = MAX_IMAGES - currentCount
        if (remaining <= 0) {
          this.$message.warning('最多上传5张图片')
          return
        }
        const toProcess = Math.min(files.length, remaining)
        if (!this.mediaFiles) this.mediaFiles = []
        const startIdx = this.mediaFiles.length
        for (let i = 0; i < toProcess; i++) {
          const file = files[i]
          if (file.size > MAX_IMAGE_SIZE) {
            this.$message.error(`图片「${file.name || 'paste.png'}」超过 1MB，无法上传（当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`)
            continue
          }
          const id = Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2)
          this.mediaFiles.push({
            id, name: file.name || 'paste.png', dataUrl: '', filePath: '',
            type: file.type || 'image/png', uploading: true
          })
        }
        for (let i = 0; i < toProcess; i++) {
          const file = files[i]
          if (file.size > MAX_IMAGE_SIZE) continue
          const idx = startIdx + i
          if (idx >= this.mediaFiles.length) continue
          try {
            const result = await uploadSingleMedia(file)
            this.mediaFiles[idx].dataUrl = result.dataUrl
            this.mediaFiles[idx].filePath = result.filePath
            this.mediaFiles[idx].type = result.type
            this.mediaFiles[idx].uploading = false
          } catch (e) {
            this.$message.error('图片上传失败: ' + (e.message || e))
            this.mediaFiles.splice(idx, 1)
          }
        }
      },
      handleImageUpload() {
        if (this.disabled) return
        const el = this.$refs.mediaInput
        if (el) {
          if (Array.isArray(el)) el[0]?.click()
          else el.click()
        }
      },
      async handleImageSelected(event) {
        const files = event.target.files
        if (!files || files.length === 0) return
        event.target.value = ''
        await this._uploadFiles(Array.from(files))
      },
      async handlePasteImages(imageFiles) {
        if (this.disabled) return
        await this._uploadFiles(imageFiles)
      },
      removeMedia(fileId) {
        if (!this.mediaFiles) return
        const idx = this.mediaFiles.findIndex(f => f.id === fileId)
        if (idx > -1) this.mediaFiles.splice(idx, 1)
      },
      openImagePreview(mf) {
        this.previewImage = mf
      },
      closeImagePreview() {
        this.previewImage = null
      }
    }
  }
}
