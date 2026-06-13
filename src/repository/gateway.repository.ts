import { BaseRepository } from './base.repository.js';
import type { WafGatewayConfigRow } from '../entity/gateway.entity.js';

export type { WafGatewayConfigRow };

export class GatewayRepository extends BaseRepository {
  getConfig(type: string): WafGatewayConfigRow | undefined {
    return this.queryOne<WafGatewayConfigRow>('SELECT * FROM waf_gateway_config WHERE type = ?', [type]) || undefined;
  }

  listAll(): WafGatewayConfigRow[] {
    return this.query<WafGatewayConfigRow>('SELECT * FROM waf_gateway_config ORDER BY type');
  }

  upsertConfig(type: string, config: object): void {
    this.execute(
      `INSERT INTO waf_gateway_config (type, config) VALUES (?, ?)
       ON CONFLICT(type) DO UPDATE SET config = excluded.config, updated_at = CURRENT_TIMESTAMP`,
      [type, JSON.stringify(config)]
    );
  }

  deleteConfig(type: string): void {
    this.execute('DELETE FROM waf_gateway_config WHERE type = ?', [type]);
  }
}

export const gatewayRepository = new GatewayRepository();
