import { eventBus } from '@/utils/eventBus'

let wsInstance = null
let reconnectTimer = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const BASE_RECONNECT_DELAY = 1000

const listeners = new Map()
let sessionSubscriptions = new Map()
let statusPollTimer = null
const STATUS_POLL_INTERVAL = 5000

function getListeners(type) {
  if (!listeners.has(type)) {
    listeners.set(type, [])
  }
  return listeners.get(type)
}

function handleMessage(msg) {
  const { type } = msg
  const typeListeners = listeners.get(type) || []

  for (const callback of typeListeners) {
    try {
      callback(msg)
    } catch (e) {
      console.error('[WS] Listener error:', e)
    }
  }

  if (type === 'step') {
    const stepData = msg.data || msg
    const toolCalls = stepData.toolCalls
    if (toolCalls && Array.isArray(toolCalls)) {
      for (const tc of toolCalls) {
        const fnName = tc.function?.name
        if (fnName === 'edit_file' || fnName === 'write_file') {
          try {
            const args = JSON.parse(tc.function.arguments || '{}')
            if (args.file_path) {
              console.log('[WS] emit file:changed', { filePath: args.file_path, action: fnName })
              eventBus.emit('file:changed', { filePath: args.file_path, action: fnName })
            }
          } catch (e) {
            console.warn('[WS] parse toolCall arguments failed:', e)
          }
        }
      }
    }
  }
}

function connect(port) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    return
  }

  try {
    const wsUrl = `ws://localhost:${port}/ws/code`
    wsInstance = new WebSocket(wsUrl)

    wsInstance.onopen = () => {
      console.log('[WS] Connected')
      reconnectAttempts = 0
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      startStatusPoll()
    }

    wsInstance.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        handleMessage(msg)
      } catch (err) {
        console.error('[WS] Parse error:', err)
      }
    }

    wsInstance.onclose = () => {
      console.log('[WS] Closed')
      wsInstance = null
      stopStatusPoll()
      scheduleReconnect(port)
    }

    wsInstance.onerror = (err) => {
      console.error('[WS] Error:', err)
    }
  } catch (err) {
    console.error('[WS] Connection error:', err)
    scheduleReconnect(port)
  }
}

function scheduleReconnect(port) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[WS] Max reconnect attempts reached')
    return
  }

  if (reconnectTimer) return

  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts)
  reconnectAttempts++

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect(port)
  }, delay)
}

function disconnect() {
  stopStatusPoll()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (wsInstance) {
    wsInstance.close()
    wsInstance = null
  }
}

function send(type, data) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ type, data }))
    return true
  }
  return false
}

function isConnected() {
  return wsInstance && wsInstance.readyState === WebSocket.OPEN
}

function startStatusPoll() {
  if (statusPollTimer) return

  statusPollTimer = setInterval(() => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({ type: 'get_running_sessions', data: {} }))
    }
  }, STATUS_POLL_INTERVAL)

  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ type: 'get_running_sessions', data: {} }))
  }
}

function stopStatusPoll() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer)
    statusPollTimer = null
  }
}

export const ws = {
  init(port) {
    connect(port)
  },

  disconnect,

  send,

  isConnected,

  on(type, callback) {
    const typeListeners = getListeners(type)
    typeListeners.push(callback)

    return () => {
      const idx = typeListeners.indexOf(callback)
      if (idx > -1) {
        typeListeners.splice(idx, 1)
      }
    }
  },

  off(type, callback) {
    const typeListeners = listeners.get(type) || []
    const idx = typeListeners.indexOf(callback)
    if (idx > -1) {
      typeListeners.splice(idx, 1)
    }
  },

  subscribe(sessionId, handlers) {
    if (sessionSubscriptions.has(sessionId)) {
      sessionSubscriptions.get(sessionId)()
    }

    const unsubscribers = []
    const sessionMessageTypes = ['todos', 'session', 'step', 'compact', 'done', 'stopped', 'error']
    const globalMessageTypes = ['running_sessions']

    for (const msgType of sessionMessageTypes) {
      const handler = handlers[msgType]
      if (handler) {
        unsubscribers.push(
          this.on(msgType, (msg) => {
            const targetSessionId = msg.sessionId || (msg.data && msg.data.sessionId)
            if (targetSessionId === sessionId) {
              handler(msg.data || msg, msg)
            }
          })
        )
      }
    }

    for (const msgType of globalMessageTypes) {
      const handler = handlers[msgType]
      if (handler) {
        unsubscribers.push(
          this.on(msgType, (msg) => {
            handler(msg.data || msg, msg)
          })
        )
      }
    }

    if (handlers.running_sessions && isConnected()) {
      send('get_running_sessions', {})
    }

    const unsubscribe = () => {
      unsubscribers.forEach(fn => fn())
      sessionSubscriptions.delete(sessionId)
    }

    sessionSubscriptions.set(sessionId, unsubscribe)

    return unsubscribe
  }
}

export default ws
