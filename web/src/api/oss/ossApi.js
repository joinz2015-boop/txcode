/**
 * OSS API 封装
 */

const API_BASE = '/api';

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

export const ossApi = {
  getOssConfig() {
    return request('GET', '/oss/config');
  },

  saveOssConfig(data) {
    return request('POST', '/oss/config', data);
  },

  deleteOssConfig(id) {
    return request('POST', '/oss/config/delete', { id });
  },

  setActiveConfig(id) {
    return request('POST', '/oss/config/active', { id });
  },

  ossBrowse(prefix = '') {
    return request('GET', `/oss/browse?prefix=${encodeURIComponent(prefix)}`);
  },

  ossDownload(key) {
    window.open(`${API_BASE}/oss/download?key=${encodeURIComponent(key)}`, '_blank');
  },

  ossUpload(localPath, ossKey) {
    return request('POST', '/oss/upload', { localPath, ossKey });
  },

  ossDelete(key) {
    return request('POST', '/oss/delete', { key });
  },

  ossRename(oldKey, newKey) {
    return request('POST', '/oss/rename', { oldKey, newKey });
  },

  getOssDownloadUrl(key, expires = 3600) {
    return request('GET', `/oss/download-url?key=${encodeURIComponent(key)}&expires=${expires}`);
  }
};