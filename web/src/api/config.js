import { request } from './request.js'

export async function getConfig(key) {
  return request('GET', `/config/${key}`)
}

export async function setConfig(key, value) {
  return request('PUT', `/config/${key}`, { value })
}
