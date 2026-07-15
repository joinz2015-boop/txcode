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
    return res.json()
  }
  const res = await fetch(url, options)
  return res.json()
}

export function listSessions(params) {
  return request('GET', '/sessions', params)
}

export function getSession(id) {
  return request('GET', '/sessions/detail', { id })
}

export function createSession(data) {
  return request('POST', '/sessions', data)
}

export function deleteSession(data) {
  return request('POST', '/sessions/delete', data)
}

export function getProjects() {
  return request('GET', '/projects')
}

export function setCurrentProject(data) {
  return request('POST', '/projects/set-current', data)
}

export function getConfig() {
  return request('GET', '/config')
}

export function getSpecs() {
  return request('GET', '/specs')
}

export function getSkills() {
  return request('GET', '/skills')
}
