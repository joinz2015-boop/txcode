import { getBaseURL, getLocalBaseURL } from '@/api/index'

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

export function listPluginHosts() {
  return request('GET', '/plugin-webshell-host')
}

export function getPluginHost(id) {
  return request('GET', '/plugin-webshell-host/detail', { id })
}

export function createPluginHost(data) {
  return request('POST', '/plugin-webshell-host', data)
}

export function updatePluginHost(data) {
  return request('POST', '/plugin-webshell-host/update', data)
}

export function deletePluginHost(id) {
  return request('POST', '/plugin-webshell-host/delete', { id })
}

export function testPluginHost(id) {
  return request('POST', '/plugin-webshell-host/test', { id })
}
