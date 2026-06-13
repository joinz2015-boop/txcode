/**
 * API 封装模块
 * 
 * 提供与后端 API 交互的所有方法
 * 路由规范: /api/{module}/{action}_{module}.ts
 * 方法规范: GET(query参数) / POST(JSON body), 禁止PUT/DELETE
 */

import { wsManager } from './websocket/websocket.js';

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

export const api = {
  // ==================== 会话管理 ====================

  getSessions(limit = 20, offset = 0) {
    return request('GET', `/session/list_session?limit=${limit}&offset=${offset}`);
  },

  createSession(title = '新会话', projectPath = null) {
    return request('POST', '/session/create_session', { title, projectPath });
  },

  getSession(id) {
    return request('GET', `/session/detail_session?id=${id}`);
  },

  updateSession(id, data) {
    return request('POST', '/session/update_session', { id, ...data });
  },

  deleteSession(id) {
    return request('POST', '/session/delete_session', { id });
  },

  getSessionStatuses(sessionIds) {
    return request('POST', '/session/status_session', { sessionIds });
  },

  getMessages(sessionId) {
    return request('GET', `/chat/history_chat?sessionId=${sessionId}`);
  },

  // ==================== 提供商管理 ====================

  getProviders() {
    return request('GET', '/sys_config/list_providers_config');
  },

  getProvider(id) {
    return request('GET', `/sys_config/detail_provider_config?id=${id}`);
  },

  addProvider(provider) {
    return request('POST', '/sys_config/create_provider_config', provider);
  },

  updateProvider(id, data) {
    return request('POST', '/sys_config/update_provider_config', { id, ...data });
  },

  deleteProvider(id) {
    return request('POST', '/sys_config/delete_provider_config', { id });
  },

  setDefaultProvider(id) {
    return request('POST', '/sys_config/set_default_provider_config', { id });
  },

  // ==================== 模型管理 ====================

  getModels() {
    return request('GET', '/sys_config/list_models_config');
  },

  getModelsByProvider(providerId) {
    return request('GET', `/sys_config/list_models_config?providerId=${providerId}`);
  },

  addModel(model) {
    return request('POST', '/sys_config/create_model_config', model);
  },

  updateModel(id, data) {
    return request('POST', '/sys_config/update_model_config', { id, ...data });
  },

  deleteModel(id) {
    return request('POST', '/sys_config/delete_model_config', { id });
  },

  // ==================== AI 聊天 ====================

  chat(data) {
    return request('POST', '/chat/send_chat', data);
  },

  chatCommand(message, sessionId) {
    return request('POST', '/chat/command_chat', { message, sessionId });
  },


  uploadChatImage(file, sessionId) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('sessionId', sessionId);
    return fetch(`${API_BASE}/chat/upload_image_chat`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },

  // ==================== 技能管理 ====================

  getSkills() {
    return request('GET', '/skill/list_skill');
  },

  getSkillRepositories() {
    return request('GET', '/skill/repositories_skill');
  },

  createSkillRepository(data) {
    return request('POST', '/skill/create_repo_skill', data);
  },

  updateSkillRepository(id, data) {
    return request('POST', '/skill/update_repo_skill', { id, ...data });
  },

  deleteSkillRepository(id) {
    return request('POST', '/skill/delete_repo_skill', { id });
  },

  syncSkillRepository(id) {
    return request('POST', `/skill/sync_repo_skill`, { id });
  },

  getRemoteSkills(repoId) {
    return request('GET', `/skill/repositories_skill?repoId=${repoId}`);
  },

  downloadSkill(repoId, skillName, projectPath) {
    return request('POST', `/skill/download_repo_skill`, { repoId, skillName, projectPath });
  },

  downloadAllSkills(repoId, projectPath) {
    return request('POST', `/skill/download_repo_skill`, { repoId, all: true, projectPath });
  },

  getLocalSkills(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return request('GET', `/skill/local_skill${query}`);
  },

  getSkillContent(name) {
    return request('GET', `/skill/detail_skill?name=${encodeURIComponent(name)}`);
  },

  deleteLocalSkill(name) {
    return request('POST', '/skill/load_skill', { name, action: 'delete' });
  },

  // ==================== 配置管理 ====================

  getConfig(key) {
    return request('GET', `/sys_config/get_config?key=${encodeURIComponent(key)}`);
  },

  setConfig(key, value) {
    return request('POST', '/sys_config/set_config', { key, value });
  },

  getProxyConfig() {
    return request('GET', '/sys_config/proxy_config');
  },

  updateProxyConfig(data) {
    return request('POST', '/sys_config/proxy_config', data);
  },

  // ==================== 文件管理 ====================

  getFileTree(basePath = "/") {
    return request('GET', `/file/tree_file?path=${encodeURIComponent(basePath)}`);
  },

  getFileContent(path) {
    return request('GET', `/file/content_file?path=${encodeURIComponent(path)}`);
  },

  writeFile(path, content) {
    return request('POST', '/file/write_file', { path, content });
  },

  editFile(path, oldString, newString) {
    return request('POST', '/file/edit_file', { path, oldString, newString });
  },

  deleteFile(path) {
    return request('POST', '/file/delete_file', { filePath: path });
  },

  writeFile(path, content) {
    return request('POST', '/file/write_file', { filePath: path, content });
  },

  editFile(path, oldString, newString) {
    return request('POST', '/file/edit_file', { filePath: path, oldString, newString });
  },

  createDirectory(path) {
    return request('POST', '/file/mkdir_file', { filePath: path });
  },

  renameFile(oldPath, newPath) {
    return request('POST', '/file/rename_file', { oldPath, newPath });
  },

  browseFilesystem(path = "") {
    return request('GET', `/file/browse_file?path=${encodeURIComponent(path)}`);
  },

  async uploadFilesystem(targetDir, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetDir', targetDir);
    formData.append('filename', encodeURIComponent(file.name));
    const res = await fetch(`${API_BASE}/file/upload_file`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.success === false) {
      throw new Error(json.error || json.message || '上传失败');
    }
    return json;
  },

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

  uploadChunk(uploadId, chunkIndex, totalChunks, fileName, targetDir, chunk) {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('totalChunks', String(totalChunks));
    formData.append('fileName', encodeURIComponent(fileName));
    formData.append('targetDir', targetDir);
    formData.append('chunk', chunk);
    return fetch(`${API_BASE}/file/upload_chunk_file`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json()).then(json => {
      if (json.success === false) {
        throw new Error(json.error || '上传分片失败');
      }
      return json;
    });
  },

  mergeChunks(uploadId) {
    return request('POST', '/file/upload_merge_file', { uploadId });
  },

  downloadFilesystemWithProgress(filePath, fileName, onProgress) {
    const url = `${API_BASE}/file/download_file?path=${encodeURIComponent(filePath)}`
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

  async saveFile(targetPath, content) {
    return request('POST', '/file/write_file', { filePath: targetPath, content: Array.from(new Uint8Array(content)) });
  },

  removeFile(targetPath) {
    return request('POST', '/file/delete_file', { filePath: targetPath });
  },

  moveFile(oldPath, newPath) {
    return request('POST', '/file/rename_file', { oldPath, newPath });
  },

  getDrives() {
    return request('GET', '/file/browse_file?path=/');
  },

  getCwd() {
    return request('GET', '/file/browse_file?path=.');
  },

  // ==================== 数据库管理 ====================

  getDbTables() {
    return request('GET', '/db/tables_db');
  },

  getTableInfo(tableName) {
    return request('GET', `/db/schema_db?name=${encodeURIComponent(tableName)}`);
  },

  getTableData(tableName, page = 1, pageSize = 50) {
    return request('GET', `/db/data_db?name=${encodeURIComponent(tableName)}&page=${page}&pageSize=${pageSize}`);
  },

  getTableDataRaw(tableName, limit = 100) {
    return request('GET', `/db/data_db?name=${encodeURIComponent(tableName)}&limit=${limit}`);
  },

  executeSql(query) {
    return request('POST', '/db/data_db', { query });
  },

  getAiCallLogs(page = 1, pageSize = 50) {
    return request('GET', `/ai_log/list_ai_log?page=${page}&pageSize=${pageSize}`);
  },

  // ==================== 定时任务管理 ====================

  getScheduledTasks() {
    return request('GET', '/scheduler/list_scheduler');
  },

  getScheduledTask(id) {
    return request('GET', `/scheduler/logs_scheduler?id=${id}`);
  },

  createScheduledTask(task) {
    return request('POST', '/scheduler/create_scheduler', task);
  },

  updateScheduledTask(id, task) {
    return request('POST', '/scheduler/update_scheduler', { id, ...task });
  },

  deleteScheduledTask(id) {
    return request('POST', '/scheduler/delete_scheduler', { id });
  },

  startScheduledTask(id) {
    return request('POST', `/scheduler/start_scheduler`, { id });
  },

  stopScheduledTask(id) {
    return request('POST', `/scheduler/stop_scheduler`, { id });
  },

  runTaskNow(id) {
    return request('POST', `/scheduler/run_scheduler`, { id });
  },

  getTaskLogs(taskId, limit = 50) {
    return request('GET', `/scheduler/logs_scheduler?id=${taskId}&limit=${limit}`);
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
    return request('GET', '/email/list_email');
  },

  getEmailConfig(id) {
    return request('GET', `/email/detail_email?id=${id}`);
  },

  createEmailConfig(config) {
    return request('POST', '/email/create_email', config);
  },

  updateEmailConfig(id, config) {
    return request('POST', '/email/update_email', { id, ...config });
  },

  deleteEmailConfig(id) {
    return request('POST', '/email/delete_email', { id });
  },

  setDefaultEmailConfig(id) {
    return request('POST', '/email/set_default_email', { id });
  },

  validateEmailConfig(configId) {
    return request('POST', '/email/validate_email', { configId });
  },

  // ==================== 网关管理 ====================

  getDingtalkConfig() {
    return request('GET', '/dingtalk/config_dingtalk');
  },

  updateDingtalkConfig(config) {
    return request('POST', '/dingtalk/config_dingtalk', config);
  },

  startDingtalk() {
    return request('POST', '/dingtalk/start_dingtalk');
  },

  stopDingtalk() {
    return request('POST', '/dingtalk/stop_dingtalk');
  },

  getGatewayStatus() {
    return request('GET', '/dingtalk/status_dingtalk');
  },

  getQueueStatus() {
    return request('GET', '/gateway/queue_gateway');
  },

  // ==================== WAF 网关管理 ====================

  getWafConfig() {
    return request('GET', '/gateway/waf_config_gateway');
  },

  updateWafConfig(config) {
    return request('POST', '/gateway/waf_update_gateway', config);
  },

  startWaf() {
    return request('POST', '/gateway/waf_start_gateway');
  },

  stopWaf() {
    return request('POST', '/gateway/waf_stop_gateway');
  },

  getWafStatus() {
    return request('GET', '/gateway/waf_status_gateway');
  },

  // ==================== 终端会话管理 ====================

  getTerminalSessions() {
    return request('GET', '/terminal/list_terminal');
  },

  createTerminalSession() {
    return request('POST', '/terminal/create_terminal');
  },

  deleteTerminalSession(id) {
    return request('POST', '/terminal/delete_terminal', { id });
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
    return request('GET', '/workflow/state_workflow');
  },

  updateWorkflowState(currentCategory, currentProject, currentStep) {
    return request('POST', '/workflow/update_workflow', { currentCategory, currentProject, currentStep });
  },

  // ==================== Git 变更管理 ====================

  gitIsRepo() {
    return request('GET', '/git/is_repo_git');
  },

  gitStatus() {
    return request('GET', '/git/status_git');
  },

  gitDiff(filePath) {
    return request('GET', `/git/diff_git?file=${encodeURIComponent(filePath)}`);
  },

  gitRevert(filePath) {
    return request('POST', '/git/revert_git', { file: filePath });
  },

  gitRevertAll() {
    return request('POST', '/git/revert_all_git');
  },

  gitDeleteFile(filePath) {
    return request('POST', '/git/delete_file_git', { file: filePath });
  },

  gitDiscardUntracked() {
    return request('POST', '/git/discard_untracked_git');
  },

  // ==================== 自定义动作管理 ====================

  getCustomActions(type) {
    const query = type ? `?type=${type}` : '';
    return request('GET', `/custom_action/list_custom_action${query}`);
  },

  createCustomAction(action) {
    return request('POST', '/custom_action/create_custom_action', action);
  },

  updateCustomAction(id, action) {
    return request('POST', '/custom_action/update_custom_action', { id, ...action });
  },

  deleteCustomAction(id) {
    return request('POST', '/custom_action/delete_custom_action', { id });
  },

  // ==================== 规范管理 ====================

  getLocalSpecs(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return request('GET', `/spec/local_spec${query}`);
  },

  getSpecContent(name) {
    return request('GET', `/spec/detail_spec?name=${encodeURIComponent(name)}`);
  },

  deleteLocalSpec(name) {
    return request('POST', '/spec/delete_spec', { name });
  },

  uploadSpec(name, content) {
    return request('POST', '/spec/upload_spec', { name, content });
  },

  getSpecRepositories() {
    return request('GET', '/spec/repositories_spec');
  },

  createSpecRepository(data) {
    return request('POST', '/spec/create_repo_spec', data);
  },

  updateSpecRepository(id, data) {
    return request('POST', '/spec/update_repo_spec', { id, ...data });
  },

  deleteSpecRepository(id) {
    return request('POST', '/spec/delete_repo_spec', { id });
  },

  getRepoSpecs(repoId) {
    return request('GET', `/spec/repositories_spec?repoId=${repoId}`);
  },

  syncSpecRepository(repoId) {
    return request('POST', '/spec/sync_repo_spec', { repoId });
  },

  downloadSpec(repoId, specName, projectPath) {
    return request('POST', '/spec/download_repo_spec', { repoId, specName, projectPath });
  },

  downloadAll(repoId, projectPath) {
    return request('POST', '/spec/download_repo_spec', { repoId, all: true, projectPath });
  },

  downloadAllSpecs(repoId, projectPath) {
    return request('POST', '/spec/download_repo_spec', { repoId, all: true, projectPath });
  },

  getProjectPath() {
    return request('GET', '/project/current_project');
  },

  // ==================== Wiki ====================

  getWikiMenu() {
    return request('GET', '/wiki/menu_wiki');
  },

  getWikiContent(path) {
    return request('GET', `/wiki/content_wiki?path=${encodeURIComponent(path)}`);
  },

  getWikiAsset(path) {
    return `${API_BASE}/wiki/asset_wiki?path=${encodeURIComponent(path)}`;
  },

  // ==================== 记忆管理 ====================

  getMemory(projectPath) {
    const query = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return request('GET', `/memory/get_memory${query}`);
  },

  saveMemory(projectPath, content) {
    return request('POST', '/memory/save_memory', { projectPath, content });
  },

  // ==================== 项目管理 ====================

  getProjects() {
    return request('GET', '/project/list_project');
  },

  getCurrentProject() {
    return request('GET', '/project/current_project');
  },

  setCurrentProject(projectId) {
    return request('POST', '/project/set_current_project', { projectId });
  },

  createProject(name, path, description = '') {
    return request('POST', '/project/create_project', { name, path, description });
  },

  // ==================== 配置导出导入 ====================

  exportConfig() {
    return fetch(`${API_BASE}/sys_config/export_config`, {
      method: 'GET',
    }).then(res => {
      if (!res.ok) {
        throw new Error('导出失败');
      }
      return res.blob();
    });
  },

  importConfig(content) {
    return request('POST', '/sys_config/import_config', { content });
  },

  // ==================== 系统信息 ====================

  getSystemInfo() {
    return request('GET', '/system/info_system');
  },
};
