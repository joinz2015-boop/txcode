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

export function buildChatPayload(panel) {
  const content = panel.input.trim()
  const finalContent = panel.chatMode === 'plan'
    ? `【计划模式】禁止修改任何代码，仅对用户输入进行分析并输出分析结果。\n\n用户输入：${content}`
    : content
  const mediaFiles = (panel.mediaFiles || []).filter(f => !f.uploading && f.filePath)
  return {
    message: finalContent,
    sessionId: panel.session?.id,
    modelName: panel.modelName || undefined,
    enableDevLog: panel.enableDevLog,
    mediaFiles: mediaFiles.map(f => ({ filePath: f.filePath, type: f.type }))
  }
}
