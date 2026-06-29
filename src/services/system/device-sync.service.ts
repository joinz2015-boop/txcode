import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as https from 'node:https';
import * as http from 'node:http';
import { systemRepository } from '../../repository/system.repository.js';
import config from '../../config/tx.config.js';

function getDeviceType(): string {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'mac';
    case 'linux':
      return 'linux';
    default:
      return 'linux';
  }
}

function getMacAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.internal || !addr.mac || addr.mac === '00:00:00:00:00:00') continue;
      return addr.mac.toLowerCase();
    }
  }
  return '00:00:00:00:00:00';
}

async function reportUsage(deviceId: string, deviceType: string): Promise<void> {
  const hubUrl = config.txcodeHub;
  const reportUrl = `${hubUrl}/api/usage/report_usage`;

  const body = JSON.stringify({ device_id: deviceId, device_type: deviceType });
  const parsedUrl = new URL(reportUrl);
  const isHttps = parsedUrl.protocol === 'https:';

  const requestModule = isHttps ? https : http;

  await new Promise<void>((resolve) => {
    const req = requestModule.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
        timeout: 5000,
      },
      (res) => {
        res.resume();
        resolve();
      }
    );

    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });

    req.write(body);
    req.end();
  });
}

export function syncOnStartup(): void {
  (async () => {
    try {
      let info = systemRepository.getSystemInfo();

      if (!info) {
        const deviceId = uuidv4();
        const deviceType = getDeviceType();
        const macAddress = getMacAddress();
        systemRepository.insertSystemInfo(deviceId, deviceType, macAddress);
        info = systemRepository.getSystemInfo();
      }

      if (info) {
        await reportUsage(info.device_id, info.device_type);
      }
    } catch {
      // 静默失败
    }
  })();
}
