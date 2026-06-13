const API_BASE = '/api'

async function request(method, path, data = null, isFormData = false) {
  const options = {
    method,
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
  }
  if (data && method !== 'GET') {
    options.body = isFormData ? data : JSON.stringify(data)
  }
  const res = await fetch(`${API_BASE}${path}`, options)
  const json = await res.json()
  if (json.success === false) {
    throw new Error(json.error || json.message || '请求失败')
  }
  return json
}

export const deployApi = {
  checkRelease(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : ''
    return request('GET', `/deploy/check-release${query}`)
  },

  downloadUrl(url, projectPath) {
    return request('POST', '/deploy/download-url', { url, projectPath })
  },

  async uploadArchive(file, projectPath) {
    const formData = new FormData()
    formData.append('file', file)
    if (projectPath) formData.append('projectPath', projectPath)
    return request('POST', '/deploy/upload-archive', formData, true)
  }
}
