import { request } from '../request.js'

export async function getConfig(key) {
  return request('GET', `/sys_config/get_config?key=${encodeURIComponent(key)}`)
}

export async function setConfig(key, value) {
  return request('POST', '/sys_config/set_config', { key, value })
}

export async function getProxyConfig() {
  return request('GET', '/sys_config/proxy_config')
}

export async function updateProxyConfig(data) {
  return request('POST', '/sys_config/proxy_config', data)
}
