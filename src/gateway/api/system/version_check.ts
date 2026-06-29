import { Request, Response } from 'express';
import * as https from 'node:https';
import * as http from 'node:http';
import { getVersion } from '../../../utils/version.js';
import config from '../../../config/tx.config.js';

interface LatestVersionInfo {
  version: string;
  version_type: string;
  description: string;
  release_date: string;
}

interface VersionCheckResult {
  localVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  latestInfo: LatestVersionInfo | null;
}

function stripV(version: string): string {
  return version.replace(/^v/i, '');
}

function compareSemver(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function fetchLatestVersion(hubUrl: string): Promise<LatestVersionInfo | null> {
  return new Promise((resolve) => {
    const urlStr = `${hubUrl}/api/version/list_published_version?page=1&page_size=1`;
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
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const list = json?.data?.list || [];
            if (list.length > 0) {
              resolve(list[0] as LatestVersionInfo);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

export async function GET(_req: Request, res: Response) {
  const localVersion = getVersion();
  const hubUrl = config.txcodeHub;

  let latestVersion = localVersion;
  let hasUpdate = false;
  let latestInfo: LatestVersionInfo | null = null;

  try {
    const info = await fetchLatestVersion(hubUrl);
    if (info) {
      latestVersion = stripV(info.version);
      latestInfo = info;
      const local = stripV(localVersion);
      const latest = stripV(info.version);
      if (compareSemver(local, latest) < 0) {
        hasUpdate = true;
      }
    }
  } catch {
    hasUpdate = false;
  }

  const result: VersionCheckResult = {
    localVersion,
    latestVersion,
    hasUpdate,
    latestInfo,
  };

  res.json({ success: true, data: result });
}
