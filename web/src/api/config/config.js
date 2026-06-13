import { request } from '../request.js'

export async function getConfig(key) {
  return request('GET', `/config/get_config?key=${encodeURIComponent(key)}`)
}

export async function setConfig(key, value) {
  return request('POST', '/config/set_config', { key, value })
}

export async function getProxyConfig() {
  return request('GET', '/config/proxy_config')
}

export async function updateProxyConfig(data) {
  return request('POST', '/config/proxy_config', data)
}
