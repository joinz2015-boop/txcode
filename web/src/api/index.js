/**
 * API 封装模块
 * 
 * 提供与后端 API 交互的所有方法
 * 包括：会话管理、消息管理、提供商配置、模型配置、AI 聊天
 * 支持：HTTP REST API、SSE 流式响应
 */

import { wsManager } from './websocket/websocket_client.js';

const API_BASE = '/api';

let terminalWsInstances = new Map();

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
   * 获取多个会话的状态
   * @param {string[]} sessionIds - 会话 ID 数组
   */
  getSessionStatuses(sessionIds) {
    return request('POST', '/sessions/status', { sessionIds });
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
   * 获取单个提供商（包含 API Key）
   * @param {string} id - 提供商 ID
   */
  getProvider(id) {
    return request('GET', `/config/providers/${id}`);
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
   * 更新模型
   * @param {string} id - 模型 ID
   * @param {object} data - 更新数据
   */
  updateModel(id, data) {
    return request('PUT', `/config/models/${id}`, data);
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
   * 执行命令
   * @param {string} message - 命令内容 (以 / 开头)
   * @param {string} sessionId - 会话 ID
   */
  chatCommand(message, sessionId) {
    return request('POST', '/chat/command', { message, sessionId });
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
    return request('POST', '/files/write', { path, content });
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
    return request('POST', '/files/delete', { path });
  },

  /**
   * 创建目录
   * @param {string} path - 目录路径
   */
  createDirectory(path) {
    return request('POST', '/files/mkdir', { path });
  },

  /**
   * 重命名文件或目录
   * @param {string} path - 原路径
   * @param {string} newName - 新名称
   */
  renameFile(path, newName) {
    return request('POST', '/files/rename', { path, newName });
  },

  /**
   * 浏览文件系统
   * @param {string} path - 路径
   */
  browseFilesystem(path = "") {
    return request('GET', `/filesystem/browse?path=${encodeURIComponent(path)}`);
  },

  getCwd() {
    return request('GET', '/filesystem/cwd');
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

  /**
   * 获取AI调用日志
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   */
  getAiCallLogs(page = 1, pageSize = 50) {
    return request('GET', `/ai-logs/logs?page=${page}&pageSize=${pageSize}`);
  },

  // ==================== 定时任务管理 ====================

  getScheduledTasks() {
    return request('GET', '/tasks');
  },

  getScheduledTask(id) {
    return request('GET', `/tasks/${id}`);
  },

  createScheduledTask(task) {
    return request('POST', '/tasks', task);
  },

  updateScheduledTask(id, task) {
    return request('PUT', `/tasks/${id}`, task);
  },

  deleteScheduledTask(id) {
    return request('DELETE', `/tasks/${id}`);
  },

  startScheduledTask(id) {
    return request('POST', `/tasks/${id}/start`);
  },

  stopScheduledTask(id) {
    return request('POST', `/tasks/${id}/stop`);
  },

  runTaskNow(id) {
    return request('POST', `/tasks/${id}/run`);
  },

  getTaskLogs(taskId, limit = 50) {
    return request('GET', `/tasks/${taskId}/logs?limit=${limit}`);
  },

  // ==================== WebSocket 通信 ====================

  ws: wsManager,

  sessionWsSend(sessionId, type, data) {
    return wsManager.send(type, data);
  },

  wsIsConnected() {
    return wsManager.isConnected();
  },

  wsSubscribe(sessionId, handlers) {
    return wsManager.subscribe(sessionId, handlers);
  },

  // ==================== 邮件管理 ====================

  getEmailConfigs() {
    return request('GET', '/email/configs');
  },

  getEmailConfig(id) {
    return request('GET', `/email/configs/${id}`);
  },

  createEmailConfig(config) {
    return request('POST', '/email/configs', config);
  },

  updateEmailConfig(id, config) {
    return request('PUT', `/email/configs/${id}`, config);
  },

  deleteEmailConfig(id) {
    return request('DELETE', `/email/configs/${id}`);
  },

  setDefaultEmailConfig(id) {
    return request('PUT', `/email/configs/${id}/default`);
  },

  validateEmailConfig(configId) {
    return request('POST', '/email/validate', { configId });
  },

  // ==================== 网关管理 ====================

  getDingtalkConfig() {
    return request('GET', '/gateway/dingtalk/config');
  },

  updateDingtalkConfig(config) {
    return request('PUT', '/gateway/dingtalk/config', config);
  },

  startDingtalk() {
    return request('POST', '/gateway/dingtalk/start');
  },

  stopDingtalk() {
    return request('POST', '/gateway/dingtalk/stop');
  },

  getGatewayStatus() {
    return request('GET', '/gateway/dingtalk/status');
  },

  getQueueStatus() {
    return request('GET', '/gateway/queue/status');
  },

  // ==================== 终端会话管理 ====================

  getTerminalSessions() {
    return request('GET', '/terminal/sessions');
  },

  createTerminalSession() {
    return request('POST', '/terminal/sessions');
  },

  deleteTerminalSession(id) {
    return request('DELETE', `/terminal/sessions/${id}`);
  },

  terminalWsConnect(sessionId, onMessage, onOpen, onClose, onError) {
    if (terminalWsInstances.has(sessionId)) {
      const existing = terminalWsInstances.get(sessionId);
      if (existing.readyState === WebSocket.OPEN) {
        return existing;
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Terminal WebSocket [${sessionId}] connected`);
      if (onOpen) onOpen();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (onMessage) onMessage(msg);
      } catch (err) {
        console.error('Terminal WebSocket parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log(`Terminal WebSocket [${sessionId}] closed`);
      terminalWsInstances.delete(sessionId);
      if (onClose) onClose();
    };

    ws.onerror = (err) => {
      console.error(`Terminal WebSocket [${sessionId}] error:`, err);
      if (onError) onError(err);
    };

    terminalWsInstances.set(sessionId, ws);
    return ws;
  },

  terminalWsDisconnect(sessionId) {
    const ws = terminalWsInstances.get(sessionId);
    if (ws) {
      ws.close();
      terminalWsInstances.delete(sessionId);
    }
  },

  terminalWsSend(sessionId, type, data) {
    const ws = terminalWsInstances.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  },

  terminalWsIsConnected(sessionId) {
    const ws = terminalWsInstances.get(sessionId);
    return ws && ws.readyState === WebSocket.OPEN;
  },

  // ==================== 工作流状态管理 ====================

  getWorkflowState() {
    return request('GET', '/workflow/state');
  },

  updateWorkflowState(currentCategory, currentProject, currentStep) {
    return request('PUT', '/workflow/state', { currentCategory, currentProject, currentStep });
  },

  // ==================== Git 变更管理 ====================

  gitIsRepo() {
    return request('GET', '/git/is-repo');
  },

  gitStatus() {
    return request('GET', '/git/status');
  },

  gitDiff(filePath) {
    return request('GET', `/git/diff/${encodeURIComponent(filePath)}`);
  },

  gitRevert(filePath) {
    return request('POST', `/git/revert/${encodeURIComponent(filePath)}`);
  },

  gitRevertAll() {
    return request('POST', '/git/revert-all');
  },

  gitDeleteFile(filePath) {
    return request('POST', `/git/delete-file/${encodeURIComponent(filePath)}`);
  },

  gitDiscardUntracked() {
    return request('POST', '/git/discard-untracked');
  },

  // ==================== 自定义动作管理 ====================

  getCustomActions(type) {
    const query = type ? `?type=${type}` : '';
    return request('GET', `/custom-actions${query}`);
  },

  createCustomAction(action) {
    return request('POST', '/custom-actions', action);
  },

  updateCustomAction(id, action) {
    return request('PUT', `/custom-actions/${id}`, action);
  },

  deleteCustomAction(id) {
    return request('DELETE', `/custom-actions/${id}`);
  },
};
