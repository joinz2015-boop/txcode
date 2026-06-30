import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import { systemRepository } from '../../repository/system.repository.js';
import { txcodeHubService } from '../hub/txcode_hub.service.js';

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
        await txcodeHubService.reportUsage(info.device_id, info.device_type);
      }
    } catch {
      // 静默失败
    }
  })();
}
