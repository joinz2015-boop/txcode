import { Request, Response } from 'express';
import { getVersion } from '../../../utils/version.js';
import { txcodeHubService } from '../../../services/hub/txcode_hub.service.js';

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

export async function GET(_req: Request, res: Response) {
  const localVersion = getVersion();

  let latestVersion = localVersion;
  let hasUpdate = false;
  let latestInfo: LatestVersionInfo | null = null;

  try {
    const info = await txcodeHubService.fetchLatestVersion();
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
