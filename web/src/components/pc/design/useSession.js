import { reactive, computed } from 'vue'
import { api } from '../../../api/index.js'

const state = reactive({
  sessions: [],
  activeSessionId: null,
  filterMode: 'all',
  currentPage: '',
})

function getPageBaseName(pagePath) {
  if (!pagePath) return ''
  const normalized = pagePath.replace(/\\/g, '/')
  const fileName = normalized.split('/').pop() || ''
  return fileName.replace(/\.html$/, '')
}

export function useSession() {
  function getSessionJsonPath(basePath) {
    return (basePath || '.txcode/design') + '/session.json'
  }

  async function readSessionJson(basePath) {
    try {
      const res = await api.getFileContent(getSessionJsonPath(basePath))
      if (res && res.data?.content) {
        const data = JSON.parse(res.data.content)
        if (data.pageSessions && !data.sessions) {
          data.sessions = []
          for (const [pagePath, val] of Object.entries(data.pageSessions)) {
            if (pagePath.endsWith('.html') && pagePath !== 'session.json' && val.sessionId) {
              const baseName = getPageBaseName(pagePath)
              data.sessions.push({
                id: val.sessionId,
                sessionId: val.sessionId,
                title: baseName ? baseName + '_设计会话' : pagePath,
                page: pagePath,
                createdAt: val.createdAt || new Date().toISOString(),
                updatedAt: val.updatedAt || new Date().toISOString()
              })
            }
          }
          if (data.sessions.length > 0) {
            data.activeSessionId = data.sessions[data.sessions.length - 1].id
          }
          writeSessionJson(basePath, data).catch(() => {})
        }
        return data
      }
    } catch (e) {
    }
    return { sessions: [], activeSessionId: null, pageSessions: {} }
  }

  async function writeSessionJson(basePath, data) {
    await api.writeFile(getSessionJsonPath(basePath), JSON.stringify(data, null, 2))
  }

  const filteredSessions = computed(() => {
    if (state.filterMode === 'page' && state.currentPage) {
      const currentBaseName = getPageBaseName(state.currentPage)
      return state.sessions.filter(s => {
        if (!s.page) return false
        return getPageBaseName(s.page) === currentBaseName
      })
    }
    return state.sessions
  })

  const currentSessionTitle = computed(() => {
    if (!state.activeSessionId) return null
    const session = state.sessions.find(s => s.id === state.activeSessionId)
    return session ? session.title : ''
  })

  function getSmartSessionTitle() {
    const baseName = getPageBaseName(state.currentPage)
    if (baseName) {
      return baseName + '_设计会话'
    }
    return '新设计会话'
  }

  async function loadSessions(basePath) {
    const data = await readSessionJson(basePath)
    state.sessions = (data.sessions || []).sort((a, b) => {
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    })
    state.activeSessionId = null
    const activeId = data.activeSessionId
    if (activeId && state.sessions.some(s => s.id === activeId)) {
      state.activeSessionId = activeId
    }
  }

  async function createNewSession(basePath) {
    const title = getSmartSessionTitle()
    try {
      const res = await api.createSession(title)
      const backendSessionId = res.data.id
      const localId = backendSessionId
      const now = new Date().toISOString()
      const newSession = {
        id: localId,
        sessionId: backendSessionId,
        title: title,
        page: state.currentPage || '',
        createdAt: now,
        updatedAt: now
      }
      state.sessions.unshift(newSession)
      const data = await readSessionJson(basePath)
      data.sessions = state.sessions
      data.activeSessionId = localId
      await writeSessionJson(basePath, data)
      state.activeSessionId = localId
      return newSession
    } catch (e) {
      throw e
    }
  }

  async function selectSession(session, basePath) {
    if (!session) return
    state.activeSessionId = session.id
    const data = await readSessionJson(basePath)
    data.activeSessionId = session.id
    writeSessionJson(basePath, data).catch(() => {})
  }

  async function renameSession(session, newTitle, basePath) {
    if (!newTitle.trim()) return
    const target = state.sessions.find(s => s.id === session.id)
    if (target) {
      target.title = newTitle.trim()
      target.updatedAt = new Date().toISOString()
      const data = await readSessionJson(basePath)
      data.sessions = state.sessions
      await writeSessionJson(basePath, data)
    }
  }

  async function deleteSession(session, basePath) {
    try {
      if (session.sessionId) {
        await api.deleteSession(session.sessionId)
      }
    } catch (e) {
      console.error('Delete backend session failed:', e)
    }
    const idx = state.sessions.findIndex(s => s.id === session.id)
    if (idx !== -1) {
      state.sessions.splice(idx, 1)
    }
    const data = await readSessionJson(basePath)
    data.sessions = state.sessions
    if (state.activeSessionId === session.id) {
      state.activeSessionId = null
      data.activeSessionId = null
    }
    await writeSessionJson(basePath, data)
  }

  async function persistSessions(basePath) {
    const data = await readSessionJson(basePath)
    data.sessions = state.sessions
    data.activeSessionId = state.activeSessionId
    await writeSessionJson(basePath, data)
  }

  function formatSessionTime(isoStr) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${min}`
  }

  return {
    state,
    filteredSessions,
    currentSessionTitle,
    loadSessions,
    createNewSession,
    selectSession,
    renameSession,
    deleteSession,
    persistSessions,
    formatSessionTime,
  }
}
