import { uploadChatImage } from './chat.js'
import { compressImage } from '../../utils/imageCompress.js'

export async function uploadSingleMedia(file) {
  const compressed = await compressImage(file)
  const uploadFile = new File([compressed.blob], file.name || 'image.png', { type: 'image/jpeg' })
  const res = await uploadChatImage(uploadFile)
  return {
    dataUrl: compressed.dataUrl,
    filePath: res.data.filePath,
    type: res.data.filePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
  }
}
