import { BaseRepository } from './base.repository.js';

export interface SystemRow {
  id: number;
  device_id: string;
  device_type: string;
  mac_address: string;
  platform_account: string;
  platform_password: string;
  created_at: string;
  updated_at: string;
}

export class SystemRepository extends BaseRepository {
  getSystemInfo(): SystemRow | undefined {
    return this.queryOne<SystemRow>('SELECT * FROM tx_system WHERE id = 1') || undefined;
  }

  insertSystemInfo(deviceId: string, deviceType: string, macAddress: string): void {
    this.execute(
      `INSERT INTO tx_system (id, device_id, device_type, mac_address) VALUES (1, ?, ?, ?)`,
      [deviceId, deviceType, macAddress]
    );
  }

  updatePlatformAccount(account: string, password: string): void {
    this.execute(
      `UPDATE tx_system SET platform_account = ?, platform_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
      [account, password]
    );
  }
}

export const systemRepository = new SystemRepository();
