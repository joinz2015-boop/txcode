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

// ========== Provider API ==========
export function listProviders() {
  return request('GET', '/sys_config/list_providers_config')
}

export function getProvider(id) {
  return request('GET', '/sys_config/detail_provider_config', { id })
}

export function createProvider(data) {
  return request('POST', '/sys_config/create_provider_config', data)
}

export function updateProvider(id, data) {
  return request('POST', '/sys_config/update_provider_config', { id, ...data })
}

export function deleteProvider(id) {
  return request('POST', '/sys_config/delete_provider_config', { id })
}

export function setDefaultProvider(id) {
  return request('POST', '/sys_config/set_default_provider_config', { id })
}

// ========== Models API ==========
export function getModels() {
  return request('GET', '/sys_config/list_models_config')
}

export function getModelsByProvider(providerId) {
  return request('GET', '/sys_config/list_models_config', { providerId })
}

export function createModel(data) {
  return request('POST', '/sys_config/create_model_config', data)
}

export function updateModel(id, data) {
  return request('POST', '/sys_config/update_model_config', { id, ...data })
}

export function deleteModel(id) {
  return request('POST', '/sys_config/delete_model_config', { id })
}

// ========== Config Export/Import ==========
export function exportConfig() {
  const url = `${getBaseURL()}/api/sys_config/export_config`
  return fetch(url).then(res => {
    if (!res.ok) throw new Error('导出失败')
    return res.blob()
  })
}

export function importConfig(content) {
  return request('POST', '/sys_config/import_config', { content })
}

// ========== Songbing AI ==========
export function getSongbingConfig() {
  return request('GET', '/songbing/config_songbing')
}

export function startSongbingAuth(platformUrl) {
  return request('POST', '/songbing/auth_start_songbing', { platformUrl })
}

export function verifySongbingAuth(key) {
  return request('POST', '/songbing/auth_verify_songbing', { key })
}

export function cancelSongbingAuth() {
  return request('POST', '/songbing/auth_cancel_songbing')
}

export function syncSongbingModels() {
  return request('POST', '/songbing/sync_models_songbing')
}

// ========== Image Upload ==========
export function uploadChatImage(file, sessionId) {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('sessionId', sessionId)
  return fetch(`${getBaseURL()}/api/chat/upload_image_chat`, {
    method: 'POST',
    body: formData
  }).then(res => res.json())
}

// ========== Skill API ==========
export function getSkills() {
  return request('GET', '/skill/list_skill')
}

export function getLocalSkills(projectPath) {
  const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : ''
  return request('GET', `/skill/local_skill${query}`)
}

// ========== Custom Action API ==========
export function listCustomActions(actionType) {
  return request('GET', '/custom_action/list_custom_action', { type: actionType || 'code' })
}

// ========== Git API ==========
export function gitIsRepo() {
  return request('GET', '/git/is_repo_git')
}

export function gitStatus() {
  return request('GET', '/git/status_git')
}

export function gitDiff(filePath, isNew) {
  let url = `/git/diff_git?file=${encodeURIComponent(filePath)}`
  if (isNew) url += '&isNew=true'
  return request('GET', url)
}

export function gitRevert(filePath) {
  return request('POST', '/git/revert_git', { file: filePath })
}

export function gitRevertAll() {
  return request('POST', '/git/revert_all_git')
}

export function gitDeleteFile(filePath) {
  return request('POST', '/git/delete_file_git', { file: filePath })
}

export function gitDiscardUntracked() {
  return request('POST', '/git/discard_untracked_git')
}

// ========== Project API ==========
export function getProjects() {
  return request('GET', '/project/list_project')
}

export function getCurrentProject() {
  return request('GET', '/project/current_project')
}

export function setCurrentProject(projectId) {
  return request('POST', '/project/set_current_project', { id: projectId })
}

export function createProject(name, path, description = '') {
  return request('POST', '/project/create_project', { name, path, description })
}

export function deleteProject(id) {
  return request('POST', '/project/delete_project', { id })
}

// ========== File API ==========
export function getDrives() {
  return request('GET', '/file/drives_file')
}

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
