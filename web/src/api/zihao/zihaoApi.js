const API_BASE = '/api'

async function request(method, path, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const res = await fetch(`${API_BASE}${path}`, options)
  const json = await res.json()

  if (json.success === false) {
    throw new Error(json.error || json.message || '请求失败')
  }

  return json
}

export const zihaoApi = {
  getZihaoConfig() {
    return request('GET', '/zihao/config')
  },

  saveZihaoConfig(data) {
    return request('POST', '/zihao/config', data)
  },

  deleteZihaoConfig(id) {
    return request('POST', '/zihao/config/delete', { id })
  },

  setActiveConfig(id) {
    return request('POST', '/zihao/config/active', { id })
  },

  connect() {
    return request('POST', '/zihao/connect')
  },

  browse(remotePath = '/') {
    return request('GET', `/zihao/browse?path=${encodeURIComponent(remotePath)}`)
  },

  viewFile(remotePath) {
    return request('GET', `/zihao/view?path=${encodeURIComponent(remotePath)}`)
  },

  create(name, parentPath, type) {
    return request('POST', '/zihao/create', { name, path: parentPath, type })
  },

  rename(oldPath, newName) {
    return request('POST', '/zihao/rename', { oldPath, newName })
  },

  deleteFile(remotePath, type) {
    return request('POST', '/zihao/delete', { path: remotePath, type })
  },

  saveContent(remotePath, content) {
    return request('POST', '/zihao/save-content', { path: remotePath, content })
  },

  getHomeDir() {
    return request('GET', '/zihao/home-dir')
  },

  uploadChunk(targetDir, fileName, chunkIndex, totalChunks, chunk) {
    const formData = new FormData()
    formData.append('targetDir', targetDir)
    formData.append('fileName', encodeURIComponent(fileName))
    formData.append('chunkIndex', String(chunkIndex))
    formData.append('totalChunks', String(totalChunks))
    formData.append('chunk', chunk)
    return fetch(`${API_BASE}/zihao/chunk-upload`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json()).then(json => {
      if (json.success === false) {
        throw new Error(json.error || '上传分片失败')
      }
      return json
    })
  },

  uploadWithProgress(localFilePath, fileName, targetDir, onProgress) {
    const CHUNK_SIZE = 1 * 1024 * 1024
    const file = localFilePath
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    const doUpload = async () => {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)
        await this.uploadChunk(targetDir, fileName, i, totalChunks, chunk)
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalChunks) * 100))
        }
      }
      return { success: true }
    }

    return doUpload()
  },

  async download(remotePath, localPath, onProgress) {
    const url = `${API_BASE}/zihao/download?path=${encodeURIComponent(remotePath)}&localPath=${encodeURIComponent(localPath)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('下载失败')

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取响应')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (typeof data.progress === 'number') {
            onProgress(data.progress)
          } else if (data.done) {
            onProgress(100)
          } else if (data.success === false) {
            throw new Error(data.error)
          }
        } catch (e) {}
      }
    }
  }
}
