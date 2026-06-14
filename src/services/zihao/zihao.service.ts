import * as fs from 'fs';
import * as path from 'path';
import { zihaoConfigRepository, ZihaoConfig } from '../../repository/zihao-config.repository.js';
import { encrypt, decrypt } from '../../utils/crypto.js';

export interface ZihaoFileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modify_time?: string;
}

interface ZihaoResponse {
  code: number;
  message?: string;
  data: any;
}

function logError(msg: string, error: unknown): void {
  console.error(`[zihao.service] ${msg}:`, error);
}

export class ZihaoService {
  private token: string | null = null;
  private config: ZihaoConfig | null = null;

  getConfig(): ZihaoConfig | null {
    const config = zihaoConfigRepository.findActive();
    if (config) {
      return { ...config, password: '' };
    }
    return null;
  }

  getAllConfigs(): ZihaoConfig[] {
    return zihaoConfigRepository.findAll().map(c => ({ ...c, password: '' }));
  }

  saveConfig(data: {
    id?: string;
    name: string;
    url: string;
    username: string;
    password: string;
    is_active?: number;
  }): ZihaoConfig {
    const encryptedPassword = encrypt(data.password);

    if (data.id) {
      const existing = zihaoConfigRepository.findById(data.id);
      if (existing) {
        const updateData: Partial<ZihaoConfig> = {
          name: data.name,
          url: data.url,
          username: data.username,
          password: encryptedPassword,
        };
        if (data.is_active !== undefined) {
          updateData.is_active = data.is_active;
        }
        zihaoConfigRepository.update(data.id, updateData);
        return zihaoConfigRepository.findById(data.id)!;
      }
    }

    const config: Omit<ZihaoConfig, 'created_at' | 'updated_at'> = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      url: data.url,
      username: data.username,
      password: encryptedPassword,
      is_active: data.is_active ?? 1
    };

    return zihaoConfigRepository.insert(config);
  }

  deleteConfig(id: string): void {
    zihaoConfigRepository.delete(id);
    if (this.config?.id === id) {
      this.config = null;
      this.token = null;
    }
  }

  setActiveConfig(id: string): void {
    zihaoConfigRepository.setActive(id);
    this.config = null;
    this.token = null;
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    try {
      const config = zihaoConfigRepository.findActive();
      if (!config) {
        return { success: false, message: '未配置梓豪平台连接' };
      }
      const decryptedPassword = decrypt(config.password);
      const result = await this.callRemote(config.url, '/api/user/login', 'POST', {
        username: config.username,
        password: decryptedPassword
      }, false);
      if (result.code === 200 && result.data?.token) {
        this.token = result.data.token;
        this.config = config;
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: result.message || '登录失败' };
    } catch (error: unknown) {
      return { success: false, message: (error as Error).message };
    }
  }

  private async ensureToken(): Promise<{ url: string; token: string }> {
    if (this.token && this.config) {
      return { url: this.config.url, token: this.token };
    }
    const config = zihaoConfigRepository.findActive();
    if (!config) throw new Error('未配置梓豪平台连接');
    const decryptedPassword = decrypt(config.password);
    const result = await this.callRemote(config.url, '/api/user/login', 'POST', {
      username: config.username,
      password: decryptedPassword
    }, false);
    if (result.code !== 200 || !result.data?.token) {
      throw new Error(result.message || '登录梓豪平台失败');
    }
    this.token = result.data.token;
    this.config = config;
    return { url: config.url, token: this.token! };
  }

  private async callRemote(
    baseUrl: string,
    apiPath: string,
    method: string,
    body?: any,
    requireAuth: boolean = true,
    isFormData: boolean = false,
    retried: boolean = false
  ): Promise<ZihaoResponse> {
    const url = baseUrl.replace(/\/$/, '') + apiPath;
    const headers: Record<string, string> = {};

    if (requireAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      if (isFormData) {
        options.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(url, options);
    const json = await response.json();
    const result = json as ZihaoResponse;

    if (result.code === 401 && !retried && requireAuth) {
      this.token = null;
      await this.ensureToken();
      return this.callRemote(baseUrl, apiPath, method, body, requireAuth, isFormData, true);
    }

    return result;
  }

  async browse(remotePath: string = '/'): Promise<{ items: ZihaoFileItem[] }> {
    const { url, token } = await this.ensureToken();
    this.token = token;
    const result = await this.callRemote(url, `/api/file/list_file?path=${encodeURIComponent(remotePath)}`, 'GET');
    if (result.code !== 200) {
      throw new Error(result.message || '浏览目录失败');
    }
    return { items: (result.data || []) as ZihaoFileItem[] };
  }

  async viewFile(remotePath: string): Promise<{ content: string; path: string }> {
    const { url } = await this.ensureToken();
    const result = await this.callRemote(url, `/api/file/view_file?path=${encodeURIComponent(remotePath)}`, 'GET');
    if (result.code !== 200) {
      throw new Error(result.message || '查看文件失败');
    }
    return result.data;
  }

  async create(name: string, parentPath: string, type: 'file' | 'folder'): Promise<ZihaoFileItem> {
    const { url } = await this.ensureToken();
    const result = await this.callRemote(url, '/api/file/save_file', 'POST', { name, path: parentPath, type });
    if (result.code !== 200) {
      throw new Error(result.message || '创建失败');
    }
    return result.data;
  }

  async rename(oldPath: string, newName: string): Promise<ZihaoFileItem> {
    const { url } = await this.ensureToken();
    const result = await this.callRemote(url, '/api/file/rename_file', 'POST', { old_path: oldPath, new_name: newName });
    if (result.code !== 200) {
      throw new Error(result.message || '重命名失败');
    }
    return result.data;
  }

  async deleteFile(remotePath: string, type: 'file' | 'folder'): Promise<void> {
    const { url } = await this.ensureToken();
    const result = await this.callRemote(url, '/api/file/delete_file', 'POST', { path: remotePath, type });
    if (result.code !== 200) {
      throw new Error(result.message || '删除失败');
    }
  }

  async saveContent(remotePath: string, content: string): Promise<void> {
    const { url } = await this.ensureToken();
    const result = await this.callRemote(url, '/api/file/save_file_content', 'POST', { path: remotePath, content });
    if (result.code !== 200) {
      throw new Error(result.message || '保存内容失败');
    }
  }

  async getHomeDir(): Promise<string> {
    const { url } = await this.ensureToken();
    const result = await this.callRemote(url, '/api/file/home_dir', 'GET');
    if (result.code !== 200) {
      throw new Error(result.message || '获取主目录失败');
    }
    return result.data?.home_dir || '/';
  }

  async chunkUpload(
    remotePath: string,
    filename: string,
    chunkIndex: number,
    totalChunks: number,
    chunkBuffer: Buffer
  ): Promise<{ status: string; progress: number; total: number; file?: ZihaoFileItem }> {
    const { url } = await this.ensureToken();
    const formData = new FormData();
    formData.append('path', remotePath);
    formData.append('filename', filename);
    formData.append('chunk_index', String(chunkIndex));
    formData.append('total_chunks', String(totalChunks));
    formData.append('chunk', new Blob([new Uint8Array(chunkBuffer)]), filename);

    const result = await this.callRemote(url, '/api/file/chunk_upload', 'POST', formData, true, true);
    if (result.code !== 200) {
      throw new Error(result.message || '分片上传失败');
    }
    return result.data;
  }

  async downloadStream(
    remotePath: string,
    localPath: string,
    onProgress: (progress: number) => void
  ): Promise<void> {
    const { url } = await this.ensureToken();
    const remoteUrl = url.replace(/\/$/, '') + `/api/file/download_file?path=${encodeURIComponent(remotePath)}`;

    const response = await fetch(remoteUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total > 0) {
        onProgress(Math.round((loaded / total) * 100));
      }
    }

    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(localPath, buffer);
    onProgress(100);
  }
}

export const zihaoService = new ZihaoService();
