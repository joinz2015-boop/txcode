import { BaseRepository } from './base.repository.js';
import { v4 as uuidv4 } from 'uuid';
import type { ProviderRow } from '../entity/provider.entity.js';
import type { ModelRow } from '../entity/model.entity.js';
import type { ConfigRow, ProxyRow, DingTalkRow } from '../entity/config.entity.js';

export type { ProviderRow, ModelRow, ConfigRow, ProxyRow, DingTalkRow };

export class ConfigRepository extends BaseRepository {
  listProviders(): ProviderRow[] {
    return this.query<ProviderRow>('SELECT * FROM providers ORDER BY created_at');
  }

  getProvider(id: string): ProviderRow | undefined {
    return this.queryOne<ProviderRow>('SELECT * FROM providers WHERE id = ?', [id]) || undefined;
  }

  getDefaultProvider(): ProviderRow | undefined {
    return this.queryOne<ProviderRow>('SELECT * FROM providers WHERE is_default = 1 LIMIT 1') || undefined;
  }

  insertProvider(data: { id?: string; name: string; apiKey: string; baseUrl?: string; enabled?: boolean; isDefault?: boolean }): string {
    const count = this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM providers');
    const isFirst = (count?.count || 0) === 0;
    const id = data.id || uuidv4();
    this.execute(
      `INSERT INTO providers (id, name, api_key, base_url, enabled, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.apiKey, data.baseUrl || 'https://api.openai.com/v1', data.enabled ? 1 : 0, (isFirst || data.isDefault) ? 1 : 0]
    );
    return id;
  }

  updateProvider(id: string, data: Partial<{ name: string; apiKey: string; baseUrl: string; enabled: boolean; isDefault: boolean }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.apiKey !== undefined) { updates.push('api_key = ?'); values.push(data.apiKey); }
    if (data.baseUrl !== undefined) { updates.push('base_url = ?'); values.push(data.baseUrl); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.isDefault !== undefined) { updates.push('is_default = ?'); values.push(data.isDefault ? 1 : 0); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE providers SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  deleteProvider(id: string): void {
    this.execute('DELETE FROM providers WHERE id = ?', [id]);
  }

  setDefaultProvider(id: string): void {
    this.execute('UPDATE providers SET is_default = 0');
    this.execute('UPDATE providers SET is_default = 1 WHERE id = ?', [id]);
  }

  listModels(providerId: string): ModelRow[] {
    return this.query<ModelRow>('SELECT * FROM models WHERE provider_id = ?', [providerId]);
  }

  allModels(): ModelRow[] {
    return this.query<ModelRow>('SELECT * FROM models');
  }

  insertModel(data: { id?: string; providerId: string; name: string; contextWindow?: number; maxOutputTokens?: number; supportsVision?: boolean; supportsTools?: boolean; enabled?: boolean }): string {
    const id = data.id || uuidv4();
    this.execute(
      `INSERT INTO models (id, provider_id, name, context_window, max_output_tokens, supports_vision, supports_tools, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.providerId, data.name, data.contextWindow || 4096, data.maxOutputTokens || 4096,
       data.supportsVision ? 1 : 0, data.supportsTools !== false ? 1 : 0, data.enabled ? 1 : 0]
    );
    return id;
  }

  updateModel(id: string, data: Partial<{ name: string; enabled: boolean }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  deleteModel(id: string): void {
    this.execute('DELETE FROM models WHERE id = ?', [id]);
  }

  getModel(id: string): ModelRow | undefined {
    return this.queryOne<ModelRow>('SELECT * FROM models WHERE id = ?', [id]) || undefined;
  }

  getConfig(key: string): string | undefined {
    const row = this.queryOne<ConfigRow>('SELECT value FROM config WHERE key = ?', [key]);
    return row?.value;
  }

  setConfig(key: string, value: string): void {
    this.execute(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  getModelProvider(modelName: string): ProviderRow | undefined {
    return this.queryOne<ProviderRow>(
      `SELECT p.* FROM providers p
       INNER JOIN models m ON m.provider_id = p.id
       WHERE m.name = ? LIMIT 1`,
      [modelName]
    ) || undefined;
  }

  getDingTalkConfig(): DingTalkRow | undefined {
    return this.queryOne<DingTalkRow>('SELECT * FROM dingding_config WHERE id = 1') || undefined;
  }

  updateDingTalkConfig(data: { enabled?: boolean; clientId?: string; clientSecret?: string; botName?: string }): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.clientId !== undefined) { updates.push('client_id = ?'); values.push(data.clientId); }
    if (data.clientSecret !== undefined) { updates.push('client_secret = ?'); values.push(data.clientSecret); }
    if (data.botName !== undefined) { updates.push('bot_name = ?'); values.push(data.botName); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(1);
      this.execute(`UPDATE dingding_config SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  getProxyConfig(): ProxyRow | undefined {
    return this.queryOne<ProxyRow>('SELECT * FROM proxy_config WHERE id = 1') || undefined;
  }

  updateProxyConfig(data: { enabled?: boolean; type?: string; host?: string; port?: number }): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }
    if (data.host !== undefined) { updates.push('host = ?'); values.push(data.host); }
    if (data.port !== undefined) { updates.push('port = ?'); values.push(data.port); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(1);
      this.execute(`UPDATE proxy_config SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }
}

export const configRepository = new ConfigRepository();
