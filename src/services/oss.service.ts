/**
 * OSS Service
 * 
 * 职责：
 * - OSS业务逻辑处理
 * - OSS文件浏览、上传、下载、删除、重命名
 */

import OSS from 'ali-oss';
import * as path from 'path';
import * as fs from 'fs';
import { ossRepository, OssConfig } from '../repository/oss.repository.js';

export interface OssFileItem {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: string;
  path: string;
}

function createOssClient(config: OssConfig): OSS {
  let endpoint = config.endpoint;

  // 处理 endpoint 格式，ali-oss SDK 需要完整的 endpoint 地址
  if (endpoint) {
    // 已经是完整 URL（包括协议）
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // 已经是完整格式，保持不变
    }
    // 包含 .aliyuncs.com 但没有协议
    else if (endpoint.includes('.aliyuncs.com') || endpoint.includes('.aliyun.com')) {
      endpoint = 'https://' + endpoint;
    }
    // 只有 region（如 oss-cn-hangzhou 或 cn-hangzhou），补充完整
    else {
      // 阿里云 region 格式：oss-cn-hangzhou 或 cn-hangzhou
      endpoint = 'https://oss-' + endpoint + '.aliyuncs.com';
    }
  }

  return new OSS({
    accessKeyId: config.access_key_id,
    accessKeySecret: config.access_key_secret,
    bucket: config.bucket,
    region: config.region,
    endpoint: endpoint
  });
}

export class OssService {
  private getActiveConfig(): OssConfig {
    const config = ossRepository.findActive();
    if (!config) {
      throw new Error('OSS未配置，请先配置OSS');
    }
    return config;
  }

  getConfig(): OssConfig | undefined {
    return ossRepository.findActive();
  }

  getAllConfigs(): OssConfig[] {
    return ossRepository.findAll();
  }

  saveConfig(data: {
    id?: string;
    name: string;
    endpoint: string;
    bucket: string;
    access_key_id: string;
    access_key_secret: string;
    region: string;
    is_active?: number;
  }): OssConfig {
    if (data.id) {
      const existing = ossRepository.findById(data.id);
      if (existing) {
        ossRepository.update(data.id, data);
        return ossRepository.findById(data.id)!;
      }
    }

    const config: Omit<OssConfig, 'created_at' | 'updated_at'> = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      endpoint: data.endpoint,
      bucket: data.bucket,
      access_key_id: data.access_key_id,
      access_key_secret: data.access_key_secret,
      region: data.region || 'cn-hangzhou',
      is_active: data.is_active ?? 1
    };

    return ossRepository.insert(config);
  }

  deleteConfig(id: string): void {
    ossRepository.delete(id);
  }

  setActiveConfig(id: string): void {
    ossRepository.setActive(id);
  }

  async browse(prefix: string = ''): Promise<{ items: OssFileItem[]; nextMarker?: string }> {
    const config = this.getActiveConfig();
    const client = createOssClient(config);

    let delimiter = '/';
    if (prefix && !prefix.endsWith('/')) {
      prefix = prefix + '/';
    }

    try {
      const result = await client.list({
        prefix: prefix,
        delimiter: delimiter,
        'max-keys': 1000
      }, {});

      const items: OssFileItem[] = [];

      if (result.prefixes) {
        for (const p of result.prefixes) {
          const name = p.replace(prefix, '').replace(/\/$/, '');
          if (name) {
            items.push({
              name: name,
              type: 'folder',
              path: p
            });
          }
        }
      }

      if (result.objects) {
        for (const obj of result.objects) {
          const name = obj.name.replace(prefix, '').split('/').pop() || obj.name;
          if (name && obj.name !== prefix) {
            items.push({
              name: name,
              type: 'file',
              size: obj.size,
              modified: obj.lastModified,
              path: obj.name
            });
          }
        }
      }

      return {
        items: items.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'folder' ? -1 : 1;
        }),
        nextMarker: result.nextMarker
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`浏览OSS失败: ${err.message}`);
    }
  }

async download(key: string): Promise<Buffer> {
    const config = this.getConfig();
    if (!config) throw new Error('未配置OSS');
    const client = createOssClient(config);

    try {
      const result = await client.get(key);
      const chunks: Uint8Array[] = [];

      if (result.content) {
        if (Buffer.isBuffer(result.content)) {
          return result.content;
        } else if (result.content instanceof Uint8Array) {
          return Buffer.from(result.content);
        } else {
          for await (const chunk of result.content as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        }
      }

      return Buffer.concat(chunks);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`下载OSS文件失败: ${err.message}`);
    }
  }

  async downloadBuffer(key: string): Promise<Buffer | Uint8Array | AsyncIterable<Uint8Array>> {
    const config = this.getConfig();
    if (!config) throw new Error('未配置OSS');
    const client = createOssClient(config);

    try {
      const result = await client.get(key);
      return result.content || Buffer.alloc(0);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`下载OSS文件失败: ${err.message}`);
    }
  }

  async downloadStream(key: string, onProgress: (loaded: number, total: number) => void): Promise<Buffer> {
    const config = this.getActiveConfig();
    const client = createOssClient(config);

    try {
      const totalSize = await this.getFileSize(key);
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      const result = await client.get(key);
      if (result.content) {
        if (Buffer.isBuffer(result.content)) {
          onProgress(totalSize, totalSize);
          return result.content;
        } else if (result.content instanceof Uint8Array) {
          onProgress(totalSize, totalSize);
          return Buffer.from(result.content);
        } else {
          for await (const chunk of result.content as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
            loaded += chunk.length;
            onProgress(loaded, totalSize);
          }
        }
      }

      return Buffer.concat(chunks);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`下载OSS文件失败: ${err.message}`);
    }
  }

  async upload(localPath: string, ossKey: string, onProgress?: (progress: number) => void): Promise<void> {
    const config = this.getActiveConfig();
    const client = createOssClient(config);
    const stats = fs.statSync(localPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    try {
      if (fileSizeMB > 100) {
        await client.multipartUpload(ossKey, localPath, {
          partSize: 1024 * 1024,
          progress: onProgress
        });
      } else {
        await client.put(ossKey, localPath);
        if (onProgress) onProgress(1);
      }
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`上传文件到OSS失败: ${err.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    const config = this.getActiveConfig();
    const client = createOssClient(config);

    try {
      await client.delete(key);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`删除OSS文件失败: ${err.message}`);
    }
  }

  async rename(oldKey: string, newKey: string): Promise<void> {
    const config = this.getActiveConfig();
    const client = createOssClient(config);

    try {
      const result = await client.get(oldKey);
      let content: Buffer;

      if (Buffer.isBuffer(result.content)) {
        content = result.content;
      } else if (result.content instanceof Uint8Array) {
        content = Buffer.from(result.content);
      } else {
        const chunks: Uint8Array[] = [];
        for await (const chunk of result.content as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        content = Buffer.concat(chunks);
      }

      await client.put(newKey, content);
      await client.delete(oldKey);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`重命名OSS文件失败: ${err.message}`);
    }
  }

  getDownloadUrl(key: string, expires: number = 3600): string {
    const config = this.getActiveConfig();
    const client = createOssClient(config);

    try {
      return client.signatureUrl(key, { expires });
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`获取下载链接失败: ${err.message}`);
    }
  }

  async getFileSize(key: string): Promise<number> {
    const config = this.getActiveConfig();
    const client = createOssClient(config);

    try {
      const res = await client.head(key);
      return (res as any).size || 0;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`获取文件大小失败: ${err.message}`);
    }
  }
}

export const ossService = new OssService();
