const API_BASE = '/api'

export async function uploadChatImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/chat/upload_image_chat`, {
    method: 'POST',
    body: formData,
  })
  const json = await res.json()
  if (json.success === false) {
    throw new Error(json.error || '上传失败')
  }
  return json
}
