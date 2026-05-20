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

  /**
   * 获取技能仓库列表
   */
  getSkillRepositories() {
    return request('GET', '/skills/repositories');
  },

  /**
   * 添加技能仓库
   * @param {object} data - { name, url }
   */
  createSkillRepository(data) {
    return request('POST', '/skills/repositories', data);
  },

  /**
   * 更新技能仓库
   * @param {string} id - 仓库ID
   * @param {object} data - { name, url }
   */
  updateSkillRepository(id, data) {
    return request('PUT', `/skills/repositories/${id}`, data);
  },

  /**
   * 删除技能仓库
   * @param {string} id - 仓库ID
   */
  deleteSkillRepository(id) {
    return request('DELETE', `/skills/repositories/${id}`);
  },

  /**
   * 同步技能仓库
   * @param {string} id - 仓库ID
   */
  syncSkillRepository(id) {
    return request('POST', `/skills/repositories/${id}/sync`);
  },

  /**
   * 获取仓库远程技能列表
   * @param {string} repoId - 仓库ID
   */
  getRemoteSkills(repoId) {
    return request('GET', `/skills/repositories/${repoId}`);
  },

  /**
   * 下载单个技能到项目
   * @param {string} repoId - 仓库ID
   * @param {string} skillName - 技能名称
   * @param {string} projectPath - 项目路径
   */
  downloadSkill(repoId, skillName, projectPath) {
    return request('POST', `/skills/repositories/${repoId}/download`, { skillName, projectPath });
  },

  /**
   * 批量下载全部技能
   * @param {string} repoId - 仓库ID
   * @param {string} projectPath - 项目路径
   */
  downloadAllSkills(repoId, projectPath) {
    return request('POST', `/skills/repositories/${repoId}/download-all`, { projectPath });
  },

  /**
   * 获取本地技能列表
   * @param {string} projectPath - 项目路径
   */
  getLocalSkills(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return request('GET', `/skills/local${query}`);
  },

  /**
   * 获取技能内容
   * @param {string} name - 技能名称
   */
  getSkillContent(name) {
    return request('GET', `/skills/local/${encodeURIComponent(name)}`);
  },

  /**
   * 删除本地技能
   * @param {string} name - 技能名称
   */
  deleteLocalSkill(name) {
    return request('DELETE', `/skills/local/${encodeURIComponent(name)}`);
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

  /**
   * 上传文件到本地文件系统
   * @param {string} targetDir - 目标目录路径
   * @param {File} file - 文件对象
   */
  async uploadFilesystem(targetDir, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetDir', targetDir);
    formData.append('filename', encodeURIComponent(file.name));
    const res = await fetch(`${API_BASE}/filesystem/upload`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.success === false) {
      throw new Error(json.error || json.message || '上传失败');
    }
    return json;
  },

  /**
   * 上传文件到本地文件系统（带进度回调，分片上传支持大文件）
   * @param {string} targetDir - 目标目录路径
   * @param {File} file - 文件对象
   * @param {Function} onProgress - 进度回调 (percent: number)
   */
  uploadFilesystemWithProgress(targetDir, file, onProgress) {
    const CHUNK_SIZE = 10 * 1024 * 1024
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const uploadId = Date.now() + '-' + Math.round(Math.random() * 1E9)

    const doUpload = async () => {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)
        await this.uploadChunk(uploadId, i, totalChunks, file.name, targetDir, chunk)
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalChunks) * 95))
        }
      }
      const result = await this.mergeChunks(uploadId)
      if (onProgress) onProgress(100)
      return result
    }

    return doUpload()
  },

  /**
   * 上传分片（大文件分片上传）
   * @param {string} uploadId - 上传会话ID
   * @param {number} chunkIndex - 分片索引
   * @param {number} totalChunks - 总分片数
   * @param {string} fileName - 文件名
   * @param {string} targetDir - 目标目录
   * @param {Blob} chunk - 分片数据
   */
  uploadChunk(uploadId, chunkIndex, totalChunks, fileName, targetDir, chunk) {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('totalChunks', String(totalChunks));
    formData.append('fileName', encodeURIComponent(fileName));
    formData.append('targetDir', targetDir);
    formData.append('chunk', chunk);
    return fetch(`${API_BASE}/filesystem/upload/chunk`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json()).then(json => {
      if (json.success === false) {
        throw new Error(json.error || '上传分片失败');
      }
      return json;
    });
  },

  /**
   * 合并分片（大文件分片上传完成后合并）
   * @param {string} uploadId - 上传会话ID
   */
  mergeChunks(uploadId) {
    return request('POST', '/filesystem/upload/merge', { uploadId });
  },

  /**
   * 下载本地文件（带进度回调）
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名
   * @param {Function} onProgress - 进度回调 (percent: number)
   * @returns {Promise<{success: boolean}>}
   */
  downloadFilesystemWithProgress(filePath, fileName, onProgress) {
    const url = `${API_BASE}/filesystem/download?path=${encodeURIComponent(filePath)}`
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error('下载失败: HTTP ' + response.status)
      }
      const contentLength = response.headers.get('Content-Length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      const reader = response.body.getReader()
      const chunks = []
      let loaded = 0

      const read = () => {
        return reader.read().then(({ done, value }) => {
          if (done) {
            const blob = new Blob(chunks)
            const downloadUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(downloadUrl)
            return { success: true }
          }
          chunks.push(value)
          loaded += value.length
          if (total > 0 && onProgress) {
            onProgress(Math.round((loaded / total) * 100))
          }
          return read()
        })
      }
      return read()
    })
  },

  /**
   * 保存文件到本地文件系统
   * @param {string} targetPath - 目标文件路径
   * @param {ArrayBuffer} content - 文件内容
   */
  async saveFile(targetPath, content) {
    const res = await fetch(`${API_BASE}/filesystem/save-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPath, content: Array.from(new Uint8Array(content)) })
    });
    const json = await res.json();
    if (json.success === false) {
      throw new Error(json.error || json.message || '保存失败');
    }
    return json;
  },

  /**
   * 删除文件或目录
   * @param {string} targetPath - 目标路径
   */
  deleteFile(targetPath) {
    return request('POST', '/filesystem/delete', { path: targetPath });
  },

  /**
   * 重命名文件或目录
   * @param {string} oldPath - 原路径
   * @param {string} newName - 新名称
   */
  renameFile(oldPath, newName) {
    return request('POST', '/filesystem/rename', { path: oldPath, newName });
  },

  getDrives() {
    return request('GET', '/filesystem/drives');
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

  // ==================== WAF 网关管理 ====================

  getWafConfig() {
    return request('GET', '/gateway/waf/config');
  },

  updateWafConfig(config) {
    return request('PUT', '/gateway/waf/config', config);
  },

  startWaf() {
    return request('POST', '/gateway/waf/start');
  },

  stopWaf() {
    return request('POST', '/gateway/waf/stop');
  },

  getWafStatus() {
    return request('GET', '/gateway/waf/status');
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

  // ==================== 规范管理 ====================

  getLocalSpecs(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return request('GET', `/specs/local${query}`);
  },

  getSpecContent(name) {
    return request('GET', `/specs/local/${encodeURIComponent(name)}/SPEC.md`);
  },

  deleteLocalSpec(name) {
    return request('DELETE', `/specs/local/${encodeURIComponent(name)}`);
  },

  uploadSpec(name, content) {
    return request('POST', '/specs/local/upload', { name, content });
  },

  getSpecRepositories() {
    return request('GET', '/specs/repositories');
  },

  createSpecRepository(data) {
    return request('POST', '/specs/repositories', data);
  },

  updateSpecRepository(id, data) {
    return request('PUT', `/specs/repositories/${id}`, data);
  },

  deleteSpecRepository(id) {
    return request('DELETE', `/specs/repositories/${id}`);
  },

  getRepoSpecs(repoId) {
    return request('GET', `/specs/repositories/${repoId}/specs`);
  },

  syncSpecRepository(repoId) {
    return request('POST', `/specs/repositories/${repoId}/sync`);
  },

  downloadSpec(repoId, specName, projectPath) {
    return request('POST', `/specs/repositories/${repoId}/download`, { specName, projectPath });
  },

  downloadAll(repoId, projectPath) {
    return request('POST', `/specs/repositories/${repoId}/download-all`, { projectPath });
  },

  downloadAllSpecs(repoId, projectPath) {
    return request('POST', `/specs/repositories/${repoId}/download-all`, { projectPath });
  },

  getProjectPath() {
    return request('GET', '/specs/project-path');
  },

  // ==================== Wiki ====================

  getWikiMenu() {
    return request('GET', '/wiki/menu');
  },

  getWikiContent(path) {
    return request('GET', `/wiki/content?path=${encodeURIComponent(path)}`);
  },

  getWikiAsset(path) {
    return `/api/wiki/asset?path=${encodeURIComponent(path)}`;
  },

  // ==================== 记忆管理 ====================

  getMemory(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return request('GET', `/memory${query}`);
  },

  saveMemory(projectPath, content) {
    return request('POST', '/memory/save', { projectPath, content });
  },

  // ==================== 项目管理 ====================

  getProjects() {
    return request('GET', '/projects');
  },

  getCurrentProject() {
    return request('GET', '/projects/current');
  },

  setCurrentProject(projectId) {
    return request('POST', '/projects/current', { projectId });
  },

  createProject(name, path, description = '') {
    return request('POST', '/projects', { name, path, description });
  },

  // ==================== 配置导出导入 ====================

  exportConfig() {
    return fetch(`${API_BASE}/settings/export`, {
      method: 'GET',
    }).then(res => {
      if (!res.ok) {
        throw new Error('导出失败');
      }
      return res.blob();
    });
  },

  importConfig(content) {
    return request('POST', '/settings/import', { content });
  },

  // ==================== 松饼认证 ====================

  getSongbingConfig() {
    return request('GET', '/songbing/config');
  },

  startSongbingAuth() {
    return request('POST', '/songbing/auth/start');
  },

  verifySongbingAuth(key) {
    return request('POST', '/songbing/auth/verify', { key });
  },

  syncSongbingModels() {
    return request('POST', '/songbing/sync-models');
  },
};
