/**
 * WebSocket 管理模块
 * 
 * 职责：
 * - 管理全局 WebSocket 连接
 * - 维护消息订阅者列表
 * - 根据 sessionId 分发消息到对应订阅者
 */

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/code`;

let wsInstance = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

const listeners = new Map();

function getListeners(type) {
  if (!listeners.has(type)) {
    listeners.set(type, []);
  }
  return listeners.get(type);
}

function handleMessage(msg) {
  const { type } = msg;
  const typeListeners = listeners.get(type) || [];
  
  for (const callback of typeListeners) {
    try {
      callback(msg);
    } catch (e) {
      console.error('WebSocket listener error:', e);
    }
  }
}

function connect() {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    wsInstance = new WebSocket(WS_URL);

    wsInstance.onopen = () => {
      console.log('[WS] Connected');
      reconnectAttempts = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    wsInstance.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    wsInstance.onclose = () => {
      console.log('[WS] Closed');
      wsInstance = null;
      scheduleReconnect();
    };

    wsInstance.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  } catch (err) {
    console.error('[WS] Connection error:', err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[WS] Max reconnect attempts reached');
    return;
  }

  if (reconnectTimer) return;

  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
}

function send(type, data) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ type, data }));
    return true;
  }
  return false;
}

function isConnected() {
  return wsInstance && wsInstance.readyState === WebSocket.OPEN;
}

export const wsManager = {
  connect,
  disconnect,
  send,
  isConnected,

  on(type, callback) {
    const typeListeners = getListeners(type);
    typeListeners.push(callback);

    return () => {
      const idx = typeListeners.indexOf(callback);
      if (idx > -1) {
        typeListeners.splice(idx, 1);
      }
    };
  },

  off(type, callback) {
    const typeListeners = listeners.get(type) || [];
    const idx = typeListeners.indexOf(callback);
    if (idx > -1) {
      typeListeners.splice(idx, 1);
    }
  },

  subscribe(sessionId, handlers) {
    const unsubscribers = [];
    const messageTypes = ['todos', 'session', 'step', 'compact', 'done', 'stopped', 'error'];

    for (const msgType of messageTypes) {
      const handler = handlers[msgType];
      if (handler) {
        unsubscribers.push(
          this.on(msgType, (msg) => {
            const targetSessionId = msg.sessionId || msg.data?.sessionId;
            if (targetSessionId === sessionId) {
              handler(msg.data || msg, msg);
            }
          })
        );
      }
    }

    return () => {
      unsubscribers.forEach(fn => fn());
    };
  },

  init() {
    connect();
  }
};

export default wsManager;
