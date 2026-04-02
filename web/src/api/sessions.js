import { request } from './request.js'

export async function getSessions(limit = 20, offset = 0) {
  return request('GET', `/sessions?limit=${limit}&offset=${offset}`)
}

export async function createSession(title = '新会话', projectPath = null) {
  return request('POST', '/sessions', { title, projectPath })
}

export async function getSession(id) {
  return request('GET', `/sessions/${id}`)
}

export async function updateSession(id, data) {
  return request('PUT', `/sessions/${id}`, data)
}

export async function deleteSession(id) {
  return request('DELETE', `/sessions/${id}`)
}

export async function getSessionStatuses(sessionIds) {
  return request('POST', '/sessions/status', { sessionIds })
}

export async function getMessages(sessionId) {
  return request('GET', `/chat/history/${sessionId}`)
}
