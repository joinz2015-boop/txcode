import { BaseRepository } from './base.repository.js';
import type { WafGatewayConfigRow } from '../entity/gateway.entity.js';

export type { WafGatewayConfigRow };

export class GatewayRepository extends BaseRepository {
  listAll(): WafGatewayConfigRow[] {
    return this.query<WafGatewayConfigRow>('SELECT * FROM waf_gateway_config ORDER BY id');
  }

  getWafConfig(): WafGatewayConfigRow | undefined {
    return this.queryOne<WafGatewayConfigRow>('SELECT * FROM waf_gateway_config WHERE id = 1') || undefined;
  }

  updateWafConfig(data: Partial<{ secret_key: string; server_ip: string }>): void {
    const current = this.getWafConfig();
    this.execute(
      `UPDATE waf_gateway_config SET secret_key = ?, server_ip = ?, updated_at = ? WHERE id = 1`,
      [
        data.secret_key ?? current?.secret_key ?? '',
        data.server_ip ?? current?.server_ip ?? '',
        new Date().toISOString(),
      ]
    );
  }

  upsertWafConfig(data: { secret_key: string; server_ip: string }): void {
    const existing = this.getWafConfig();
    if (existing) {
      this.execute(
        `UPDATE waf_gateway_config SET server_ip = ?, secret_key = ?, updated_at = datetime('now') WHERE id = 1`,
        [data.server_ip || '', data.secret_key || '']
      );
    } else {
      this.execute(
        `INSERT INTO waf_gateway_config (id, server_ip, secret_key) VALUES (1, ?, ?)`,
        [data.server_ip || '', data.secret_key || '']
      );
    }
  }

  updateWafStatus(status: string): void {
    this.execute(
      `UPDATE waf_gateway_config SET status = ?, updated_at = ? WHERE id = 1`,
      [status, new Date().toISOString()]
    );
  }
}

export const gatewayRepository = new GatewayRepository();
