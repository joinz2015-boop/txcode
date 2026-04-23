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

  async ossDownloadWithProgress(key, filename, targetPath, onProgress) {
    const res = await fetch(`${API_BASE}/oss/download?key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error('下载失败');
    
    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应');
    
    const totalSize = parseInt(res.headers.get('X-TotalSize') || '0', 10);
    const decoder = new TextDecoder();
    const chunks = [];
    let loaded = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.progress !== undefined) {
            onProgress(data.progress);
          } else if (data.done) {
            onProgress(100);
          } else if (data.success === false) {
            throw new Error(data.error);
          }
        } catch (e) {
          const binData = decoder.decode(value, { stream: false });
          if (binData.trim()) {
            chunks.push(decoder.encode(binData));
          }
        }
      }
    }
    
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    await api.saveFile(targetPath, await blob.arrayBuffer());
  },

  ossUpload(localPath, ossKey, onProgress) {
      const params = new URLSearchParams({ localPath, ossKey }).toString();
      return new Promise((resolve, reject) => {
        fetch(`${API_BASE}/oss/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localPath, ossKey })
        }).then(res => {
          const reader = res.body?.getReader();
          if (!reader) return reject(new Error('No response body'));

          const decoder = new TextDecoder();
          function read() {
            reader.read().then(({ done, value }) => {
              if (done) return;
              const text = decoder.decode(value, { stream: true });
              const lines = text.split('\n').filter(Boolean);
              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  if (data.progress !== undefined) {
                    if (onProgress) onProgress(data.progress);
                  } else if (data.success) {
                    resolve(data);
                  } else if (data.success === false) {
                    reject(new Error(data.error));
                  }
                } catch (e) {}
              }
              read();
            });
          }
          read();
        }).catch(reject);
      });
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