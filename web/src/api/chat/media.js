import { uploadChatImage } from './chat.js'

export async function uploadSingleMedia(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const res = await uploadChatImage(file)
  return {
    dataUrl,
    filePath: res.data.filePath,
    url: res.data.url,
    type: res.data.filePath.endsWith('.png') ? 'image/png' : (file.type || 'image/jpeg')
  }
}
