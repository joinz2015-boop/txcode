/**
 * API 封装模块
 * 
 * 提供与后端 API 交互的所有方法
 * 包括：会话管理、消息管理、提供商配置、模型配置、AI 聊天
 * 支持：HTTP REST API、SSE 流式响应、WebSocket 实时通信
 */

const API_BASE = '/api';

let wsInstance = null;
let wsListeners = new Map();
let sessionWsInstances = new Map();

function getWsUrl(sessionId = null) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (sessionId) {
    return `${protocol}//${window.location.host}/ws/${sessionId}`;
  }
  return `${protocol}//${window.location.host}/ws`;
}

async function request(method, path, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  const json = await res.json();

  if (json.success === false) {
    throw new Error(json.error || json.message || '请求失败');
  }

  return json;
}

/**
 * API 接口集合
 */
export const api = {
  // ==================== 会话管理 ====================

  /**
   * 获取会话列表
   * @param {number} limit - 返回数量限制
   * @param {number} offset - 偏移量
   */
  getSessions(limit = 20, offset = 0) {
    return request('GET', `/sessions?limit=${limit}&offset=${offset}`);
  },

  /**
   * 创建新会话
   * @param {string} title - 会话标题
   * @param {string} projectPath - 项目路径（可选）
   */
  createSession(title = '新会话', projectPath = null) {
    return request('POST', '/sessions', { title, projectPath });
  },

  /**
   * 获取单个会话
   * @param {string} id - 会话 ID
   */
  getSession(id) {
    return request('GET', `/sessions/${id}`);
  },

  /**
   * 更新会话
   * @param {string} id - 会话 ID
   * @param {object} data - 更新数据 { title }
   */
  updateSession(id, data) {
    return request('PUT', `/sessions/${id}`, data);
  },

  /**
   * 删除会话
   * @param {string} id - 会话 ID
   */
  deleteSession(id) {
    return request('DELETE', `/sessions/${id}`);
  },

  /**
   * 获取会话消息
   * @param {string} sessionId - 会话 ID
   */
  getMessages(sessionId) {
    return request('GET', `/chat/history/${sessionId}`);
  },

  // ==================== 提供商管理 ====================

  /**
   * 获取提供商列表
   */
  getProviders() {
    return request('GET', '/config/providers');
  },

  /**
   * 添加提供商
   * @param {object} provider - 提供商信息
   */
  addProvider(provider) {
    return request('POST', '/config/providers', provider);
  },

  /**
   * 更新提供商
   * @param {string} id - 提供商 ID
   * @param {object} data - 更新数据
   */
  updateProvider(id, data) {
    return request('PUT', `/config/providers/${id}`, data);
  },

  /**
   * 删除提供商
   * @param {string} id - 提供商 ID
   */
  deleteProvider(id) {
    return request('DELETE', `/config/providers/${id}`);
  },

  /**
   * 设置默认提供商
   * @param {string} id - 提供商 ID
   */
  setDefaultProvider(id) {
    return request('PUT', `/config/providers/${id}/default`);
  },

  // ==================== 模型管理 ====================

  /**
   * 获取所有模型
   */
  getModels() {
    return request('GET', '/config/models');
  },

  /**
   * 获取指定提供商的模型
   * @param {string} providerId - 提供商 ID
   */
  getModelsByProvider(providerId) {
    return request('GET', `/config/models?providerId=${providerId}`);
  },

  /**
   * 添加模型
   * @param {object} model - 模型信息
   */
  addModel(model) {
    return request('POST', '/config/models', model);
  },

  /**
   * 删除模型
   * @param {string} id - 模型 ID
   */
  deleteModel(id) {
    return request('DELETE', `/config/models/${id}`);
  },

  // ==================== AI 聊天 ====================

  /**
   * 发送聊天消息
   * @param {object} data - 聊天数据 { sessionId, message }
   */
  chat(data) {
    return request('POST', '/chat', data);
  },

  /**
   * 流式聊天
   * @param {object} data - 聊天数据
   * @param {function} onChunk - 收到数据块的回调
   */
  chatStream(data, onChunk) {
    return new Promise((resolve, reject) => {
      const es = new EventSource(
        `${API_BASE}/chat/stream?data=${encodeURIComponent(JSON.stringify(data))}`
      );

      es.onmessage = (e) => {
        try {
          const chunk = JSON.parse(e.data);
          onChunk(chunk);
          if (chunk.done) {
            es.close();
            resolve();
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      es.onerror = (err) => {
        es.close();
        reject(err);
      };
    });
  },

  // ==================== 技能管理 ====================

  /**
   * 获取所有技能
   */
  getSkills() {
    return request('GET', '/skills');
  },

  // ==================== 配置管理 ====================

  /**
   * 获取配置项
   * @param {string} key - 配置键名
   */
  getConfig(key) {
    return request('GET', `/config/${key}`);
  },

  /**
   * 设置配置项
   * @param {string} key - 配置键名
   * @param {any} value - 配置值
   */
  setConfig(key, value) {
    return request('PUT', `/config/${key}`, { value });
  },

  // ==================== 文件管理 ====================

  /**
   * 获取文件树
   * @param {string} basePath - 基础路径
   */
  getFileTree(basePath = "/") {
    return request('GET', `/files/tree?base_path=${encodeURIComponent(basePath)}`);
  },

  /**
   * 读取文件内容
   * @param {string} path - 文件路径
   */
  getFileContent(path) {
    return request('GET', `/files/content?path=${encodeURIComponent(path)}`);
  },

  /**
   * 写入文件
   * @param {string} path - 文件路径
   * @param {string} content - 文件内容
   */
  writeFile(path, content) {
    return request('POST', `/files/write?path=${encodeURIComponent(path)}`, content);
  },

  /**
   * 编辑文件
   * @param {string} path - 文件路径
   * @param {string} oldString - 旧字符串
   * @param {string} newString - 新字符串
   */
  editFile(path, oldString, newString) {
    return request('POST', `/files/edit?path=${encodeURIComponent(path)}&old_string=${encodeURIComponent(oldString)}&new_string=${encodeURIComponent(newString)}`);
  },

  /**
   * 删除文件
   * @param {string} path - 文件路径
   */
  deleteFile(path) {
    return request('POST', `/files/delete?path=${encodeURIComponent(path)}`);
  },

  /**
   * 浏览文件系统
   * @param {string} path - 路径
   */
  browseFilesystem(path = "") {
    return request('GET', `/filesystem/browse?path=${encodeURIComponent(path)}`);
  },

  // ==================== 数据库管理 ====================

  /**
   * 获取数据库表列表
   */
  getDbTables() {
    return request('GET', '/db/tables');
  },

  /**
   * 获取表结构信息
   * @param {string} tableName - 表名
   */
  getTableInfo(tableName) {
    return request('GET', `/db/tables/${encodeURIComponent(tableName)}`);
  },

  /**
   * 获取表数据
   * @param {string} tableName - 表名
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   */
  getTableData(tableName, page = 1, pageSize = 50) {
    return request('GET', `/db/tables/${encodeURIComponent(tableName)}/data?page=${page}&page_size=${pageSize}`);
  },

  /**
   * 获取表数据（简单版本）
   * @param {string} tableName - 表名
   * @param {number} limit - 限制数量
   */
  getTableDataRaw(tableName, limit = 100) {
    return request('GET', `/db/tables/${encodeURIComponent(tableName)}/data/raw?limit=${limit}`);
  },

  /**
   * 执行SQL语句
   * @param {string} query - SQL语句
   */
  executeSql(query) {
    return request('POST', '/db/execute', { query });
  },

  // ==================== WebSocket 通信 ====================

  wsConnect(onMessage, onOpen, onClose, onError) {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      return wsInstance;
    }

    const wsUrl = getWsUrl();
    wsInstance = new WebSocket(wsUrl);

    wsInstance.onopen = () => {
      console.log('WebSocket connected');
      if (onOpen) onOpen();
    };

    wsInstance.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (onMessage) onMessage(msg);
        
        const listeners = wsListeners.get(msg.type) || [];
        listeners.forEach(cb => cb(msg.data));
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    wsInstance.onclose = () => {
      console.log('WebSocket closed');
      wsInstance = null;
      if (onClose) onClose();
    };

    wsInstance.onerror = (err) => {
      console.error('WebSocket error:', err);
      if (onError) onError(err);
    };

    return wsInstance;
  },

  wsDisconnect() {
    if (wsInstance) {
      wsInstance.close();
      wsInstance = null;
    }
    wsListeners.clear();
  },

  wsOn(type, callback) {
    if (!wsListeners.has(type)) {
      wsListeners.set(type, []);
    }
    wsListeners.get(type).push(callback);
    
    return () => {
      const listeners = wsListeners.get(type) || [];
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  },

  wsSend(type, data) {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  },

  wsIsConnected() {
    return wsInstance && wsInstance.readyState === WebSocket.OPEN;
  },

  sessionWsConnect(sessionId, onMessage, onOpen, onClose, onError) {
    if (sessionWsInstances.has(sessionId)) {
      const existing = sessionWsInstances.get(sessionId);
      if (existing.readyState === WebSocket.OPEN) {
        return existing;
      }
    }

    const wsUrl = getWsUrl(sessionId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket [${sessionId}] connected`);
      if (onOpen) onOpen();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (onMessage) onMessage(msg);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket [${sessionId}] closed`);
      sessionWsInstances.delete(sessionId);
      if (onClose) onClose();
    };

    ws.onerror = (err) => {
      console.error(`WebSocket [${sessionId}] error:`, err);
      if (onError) onError(err);
    };

    sessionWsInstances.set(sessionId, ws);
    return ws;
  },

  sessionWsDisconnect(sessionId) {
    const ws = sessionWsInstances.get(sessionId);
    if (ws) {
      ws.close();
      sessionWsInstances.delete(sessionId);
    }
  },

  sessionWsSend(sessionId, type, data) {
    const ws = sessionWsInstances.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  },

  sessionWsIsConnected(sessionId) {
    const ws = sessionWsInstances.get(sessionId);
    return ws && ws.readyState === WebSocket.OPEN;
  },

  wsChat(data, callbacks) {
    const { onSession, onStep, onDone, onError } = callbacks || {};

    const unsubSession = this.wsOn('session', (data) => {
      if (onSession) onSession(data);
    });

    const unsubStep = this.wsOn('step', (data) => {
      if (onStep) onStep(data);
    });

    const unsubDone = this.wsOn('done', (data) => {
      unsubSession();
      unsubStep();
      unsubDone();
      unsubError();
      if (onDone) onDone(data);
    });

    const unsubError = this.wsOn('error', (err) => {
      if (onError) onError(err);
    });

    this.wsSend('chat', data);
  },
};
