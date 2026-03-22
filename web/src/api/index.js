/**
 * API 封装模块
 * 
 * 提供与后端 API 交互的所有方法
 * 包括：会话管理、消息管理、提供商配置、模型配置、AI 聊天
 */

// API 基础路径（开发环境通过 vite proxy 代理，生产环境直接访问）
const API_BASE = '/api';

/**
 * 通用请求方法
 * 
 * @param {string} method - HTTP 方法 (GET, POST, PUT, DELETE)
 * @param {string} path - API 路径
 * @param {object} data - 请求数据
 * @returns {Promise<object>} 响应数据
 */
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

  if (!json.success) {
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
};
