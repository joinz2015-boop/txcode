let baseURL = 'http://localhost:40000'

export function setBaseURL(port) {
  baseURL = `http://localhost:${port}`
}

function getBaseURL() {
  if (typeof window !== 'undefined' && window.__TXCODE_PORT__) {
    return `http://localhost:${window.__TXCODE_PORT__}`
  }
  return baseURL
}

async function request(method, path, data = null) {
  const url = `${getBaseURL()}/api${path}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }
  if (data && method === 'GET') {
    const params = new URLSearchParams(data).toString()
    const res = await fetch(`${url}?${params}`, options)
    const json = await res.json()
    if (json.success === false) throw new Error(json.error || json.message || '请求失败')
    return json
  }
  const res = await fetch(url, options)
  const json = await res.json()
  if (json.success === false) throw new Error(json.error || json.message || '请求失败')
  return json
}

// ========== Plan-Code API ==========
export function listPlanSessions() {
  return request('GET', '/plan-code/list')
}

export function createPlanSession(sessionName, parentPlanPath) {
  return request('POST', '/plan-code/create', { sessionName, parentPlanPath })
}

export function renamePlanSession(folderName, sessionName) {
  return request('POST', '/plan-code/update', { folderName, sessionName })
}

export function deletePlanSession(folderName) {
  return request('POST', '/plan-code/delete', { folderName })
}

export function getPlanSessionDetail(folderName) {
  return request('GET', '/plan-code/detail', { folderName })
}

export function saveMeta(folderName, meta) {
  return request('POST', '/plan-code/save-meta', { folderName, meta })
}

export function readPlan(folderName) {
  return request('GET', '/plan-code/read-plan', { folderName })
}

export function savePlan(folderName, content) {
  return request('POST', '/plan-code/save-plan', { folderName, content })
}

// ========== Session API ==========
export function listSessions(limit, offset) {
  return request('GET', '/session/list_session', { limit: limit || 20, offset: offset || 0 })
}

export function getSession(id) {
  return request('GET', '/session/detail_session', { id })
}

export function createSession(title, projectPath) {
  return request('POST', '/session/create_session', { title, projectPath })
}

export function updateSession(id, data) {
  return request('POST', '/session/update_session', { id, ...data })
}

export function deleteSession(id) {
  return request('POST', '/session/delete_session', { id })
}

// ========== Chat API ==========
export function getMessages(sessionId) {
  return request('GET', '/chat/history_chat', { sessionId })
}

// ========== Config API ==========
export function getConfig(key) {
  return request('GET', '/sys_config/get_config', { key })
}

export function setConfig(key, value) {
  return request('POST', '/sys_config/set_config', { key, value })
}

// ========== Models API ==========
export function getModels() {
  return request('GET', '/sys_config/list_models_config')
}

// ========== Project API ==========
export function getProjects() {
  return request('GET', '/project/list_project')
}

export function setCurrentProject(data) {
  return request('POST', '/project/set_current_project', data)
}

// ========== File API ==========
export function browseFilesystem(path = '') {
  return request('GET', '/file/browse_file', { path })
}

export function getFileContent(path) {
  return request('GET', '/file/content_file', { path })
}

export function writeFile(filePath, content) {
  return request('POST', '/file/write_file', { filePath, content })
}

export function createDirectory(filePath) {
  return request('POST', '/file/mkdir_file', { filePath })
}

export function deleteFile(filePath) {
  return request('POST', '/file/delete_file', { filePath })
}

export function renameFile(oldPath, newPath) {
  return request('POST', '/file/rename_file', { oldPath, newPath })
}

export function getFileTree(path = '/') {
  return request('GET', '/file/tree_file', { path })
}

export function exportFolder(path) {
  const url = `${getBaseURL()}/api/file/export_folder?path=${encodeURIComponent(path || '')}`
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error('导出失败: HTTP ' + response.status)
    }
    const disposition = response.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename\*?=(?:UTF-8''([^;]+)|"([^"]+)")/)
    let filename = 'download.zip'
    if (match) {
      filename = decodeURIComponent(match[1] || match[2] || filename)
    }
    return response.blob().then((blob) => {
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
      return { success: true }
    })
  })
}
