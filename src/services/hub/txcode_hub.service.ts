import * as https from 'node:https';
import * as http from 'node:http';
import config from '../../config/tx.config.js';

interface Category {
  id: number;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
  status: number;
  is_system: number;
  created_at: string;
  updated_at: string;
}

interface PublishedSkillItem {
  id: number;
  name: string;
  description: string;
  category_id: number;
  tags: string;
  download_count: number;
  latest_version: string;
  icon_url: string | null;
}

interface PublishedSkillListData {
  total: number;
  page: number;
  page_size: number;
  list: PublishedSkillItem[];
}

interface SpecCategory {
  id: number;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
  status: number;
  is_system: number;
  created_at: string;
  updated_at: string;
}

interface PublishedSpecItem {
  id: number;
  name: string;
  description: string;
  platform_category: string | null;
  category_id: number;
  author_id: number;
  download_count: number;
  latest_version: string;
  status: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface PublishedSpecListData {
  total: number;
  page: number;
  page_size: number;
  list: PublishedSpecItem[];
}

interface SpecDetail {
  id: number;
  name: string;
  description: string;
  platform_category: string | null;
  content_md: string;
  latest_version: string;
  download_count: number;
}

interface HubResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface LatestVersionInfo {
  version: string;
  version_type: string;
  description: string;
  release_date: string;
}

interface VersionListResponse {
  list: LatestVersionInfo[];
}

let _hubUrl: string | undefined;

function getHubUrl(): string {
  if (!_hubUrl) {
    _hubUrl = config.txcodeHub;
  }
  return _hubUrl;
}

function httpRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const hubUrl = getHubUrl();
    const urlStr = hubUrl + path;
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(bodyStr));
    }

    const req = requestModule.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
        rejectUnauthorized: false,
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function httpDownload(path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const hubUrl = getHubUrl();
    const urlStr = hubUrl + path;
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const req = requestModule.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        rejectUnauthorized: false,
        timeout: 60000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let body = '';
          res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          res.on('end', () => reject(new Error(`Download failed: ${res.statusCode} ${body}`)));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
    req.end();
  });
}

class TxcodeHubService {

  async fetchCategories(): Promise<Category[]> {
    const res = await httpRequest<HubResponse<Category[]>>('GET', '/api/skill_category/list_skill_category');
    if (res.code !== 200) {
      throw new Error(res.message || 'Failed to fetch categories');
    }
    return res.data || [];
  }

  async fetchPublishedSkills(params: {
    page?: number;
    page_size?: number;
    keyword?: string;
    category_id?: number;
  }): Promise<PublishedSkillListData> {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.page_size) queryParts.push(`page_size=${params.page_size}`);
    if (params.keyword) queryParts.push(`keyword=${encodeURIComponent(params.keyword)}`);
    if (params.category_id) queryParts.push(`category_id=${params.category_id}`);

    const query = queryParts.length > 0 ? '?' + queryParts.join('&') : '';
    const res = await httpRequest<HubResponse<PublishedSkillListData>>('GET', '/api/skill/list_published_skill' + query);
    if (res.code !== 200) {
      throw new Error(res.message || 'Failed to fetch published skills');
    }
    return res.data || { total: 0, page: 1, page_size: 20, list: [] };
  }

  async downloadSkillZip(skillId: number): Promise<Buffer> {
    return httpDownload(`/api/skill/download_skill?id=${skillId}`);
  }

  async fetchSpecCategories(): Promise<SpecCategory[]> {
    const res = await httpRequest<HubResponse<SpecCategory[]>>('GET', '/api/spec_category/list_spec_category');
    if (res.code !== 200) {
      throw new Error(res.message || 'Failed to fetch spec categories');
    }
    return res.data || [];
  }

  async fetchPublishedSpecs(params: {
    page?: number;
    page_size?: number;
    keyword?: string;
    category_id?: number;
    platform_category?: string;
  }): Promise<PublishedSpecListData> {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.page_size) queryParts.push(`page_size=${params.page_size}`);
    if (params.keyword) queryParts.push(`keyword=${encodeURIComponent(params.keyword)}`);
    if (params.category_id) queryParts.push(`category_id=${params.category_id}`);
    if (params.platform_category) queryParts.push(`platform_category=${encodeURIComponent(params.platform_category)}`);

    const query = queryParts.length > 0 ? '?' + queryParts.join('&') : '';
    const res = await httpRequest<HubResponse<PublishedSpecListData>>('GET', '/api/spec/list_published_spec' + query);
    if (res.code !== 200) {
      throw new Error(res.message || 'Failed to fetch published specs');
    }
    return res.data || { total: 0, page: 1, page_size: 20, list: [] };
  }

  async fetchSpecDetail(specId: number): Promise<SpecDetail | null> {
    try {
      const res = await httpRequest<HubResponse<SpecDetail>>('GET', `/api/spec/public_spec_detail?id=${specId}`);
      if (res.code !== 200) {
        return null;
      }
      return res.data || null;
    } catch {
      return null;
    }
  }

  async downloadSpecZip(specId: number): Promise<Buffer> {
    return httpDownload(`/api/spec/download_spec?id=${specId}`);
  }

  async reportUsage(deviceId: string, deviceType: string): Promise<void> {
    try {
      await httpRequest('POST', '/api/usage/report_usage', { device_id: deviceId, device_type: deviceType });
    } catch {
      // 静默失败
    }
  }

  async fetchLatestVersion(): Promise<LatestVersionInfo | null> {
    try {
      const res = await httpRequest<HubResponse<VersionListResponse>>('GET', '/api/version/list_published_version?page=1&page_size=1');
      if (res.code !== 200 || !res.data?.list?.length) {
        return null;
      }
      return res.data.list[0];
    } catch {
      return null;
    }
  }
}

export const txcodeHubService = new TxcodeHubService();
export type { Category, PublishedSkillItem, PublishedSkillListData, LatestVersionInfo, SpecCategory, PublishedSpecItem, PublishedSpecListData, SpecDetail };
