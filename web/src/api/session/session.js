import { request } from '../request.js'

export async function getSessions(limit = 20, offset = 0) {
  return request('GET', `/session/list_session?limit=${limit}&offset=${offset}`)
}

export async function createSession(title = '新会话', projectPath = null) {
  return request('POST', '/session/create_session', { title, projectPath })
}

export async function getSession(id) {
  return request('GET', `/session/detail_session?id=${id}`)
}

export async function updateSession(id, data) {
  return request('POST', '/session/update_session', { id, ...data })
}

export async function deleteSession(id) {
  return request('POST', '/session/delete_session', { id })
}

export async function getSessionStatuses(sessionIds) {
  return request('POST', '/session/status_session', { sessionIds })
}

export async function getMessages(sessionId) {
  return request('GET', `/chat/history_chat?sessionId=${sessionId}`)
}
