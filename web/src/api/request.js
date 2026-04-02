const API_BASE = '/api'

export async function request(method, path, data = null) {
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
