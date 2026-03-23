/**
 * 配置服务
 * 
 * 职责：
 * - 提供配置的 CRUD 操作
 * - 管理 AI 服务商
 * - 管理模型
 */

import { DbService, dbService as defaultDbService } from '../db/db.service.js';
import { Provider, Model, ProviderInput, ModelInput } from './config.types.js';
import { v4 as uuidv4 } from 'uuid';

export class ConfigService {
  private db: DbService;

  constructor(db?: DbService) {
    this.db = db || defaultDbService;
  }

  getProviders(): Provider[] {
    const rows = this.db.all<any>('SELECT * FROM providers ORDER BY created_at');
    return rows.map(this.rowToProvider);
  }

  getProvider(id: string): Provider | undefined {
    const row = this.db.get<any>('SELECT * FROM providers WHERE id = ?', [id]);
    return row ? this.rowToProvider(row) : undefined;
  }

  getDefaultProvider(): Provider | undefined {
    const row = this.db.get<any>('SELECT * FROM providers WHERE is_default = 1 LIMIT 1');
    return row ? this.rowToProvider(row) : undefined;
  }

  addProvider(provider: ProviderInput): string {
    const count = this.db.get<{count: number}>('SELECT COUNT(*) as count FROM providers');
    const isFirst = (count?.count || 0) === 0;
    const id = provider.id || uuidv4();

    this.db.run(
      `INSERT INTO providers (id, name, api_key, base_url, enabled, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        provider.name,
        provider.apiKey,
        provider.baseUrl || 'https://api.openai.com/v1',
        provider.enabled ? 1 : 0,
        (isFirst || provider.isDefault) ? 1 : 0,
      ]
    );
    return id;
  }

  updateProvider(id: string, data: Partial<Provider>): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.apiKey !== undefined) {
      updates.push('api_key = ?');
      values.push(data.apiKey);
    }
    if (data.baseUrl !== undefined) {
      updates.push('base_url = ?');
      values.push(data.baseUrl);
    }
    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(data.enabled ? 1 : 0);
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(data.isDefault ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.db.run(`UPDATE providers SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  deleteProvider(id: string): void {
    this.db.run('DELETE FROM providers WHERE id = ?', [id]);
  }

  setDefaultProvider(id: string): void {
    this.db.transaction(() => {
      this.db.run('UPDATE providers SET is_default = 0');
      this.db.run('UPDATE providers SET is_default = 1 WHERE id = ?', [id]);
    });
  }

  getModels(providerId: string): Model[] {
    const rows = this.db.all<any>('SELECT * FROM models WHERE provider_id = ?', [providerId]);
    return rows.map(this.rowToModel);
  }

  getAllModels(): Model[] {
    const rows = this.db.all<any>('SELECT * FROM models');
    return rows.map(this.rowToModel);
  }

  addModel(model: ModelInput): string {
    const id = model.id || uuidv4();
    this.db.run(
      `INSERT INTO models (id, provider_id, name, context_window, max_output_tokens, supports_vision, supports_tools, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        model.providerId,
        model.name,
        model.contextWindow || 4096,
        model.maxOutputTokens || 4096,
        model.supportsVision ? 1 : 0,
        model.supportsTools !== false ? 1 : 0,
        model.enabled ? 1 : 0,
      ]
    );
    return id;
  }

  updateModel(id: string, data: Partial<Model>): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(data.enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.db.run(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  deleteModel(id: string): void {
    this.db.run('DELETE FROM models WHERE id = ?', [id]);
  }

  get<T = string>(key: string): T | undefined {
    const row = this.db.get<{value: string}>('SELECT value FROM config WHERE key = ?', [key]);
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }

  set(key: string, value: unknown): void {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    this.db.run(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, strValue]
    );
  }

  private rowToProvider(row: any): Provider {
    return {
      id: row.id,
      name: row.name,
      apiKey: row.api_key,
      baseUrl: row.base_url,
      enabled: Boolean(row.enabled),
      isDefault: Boolean(row.is_default),
    };
  }

  private rowToModel(row: any): Model {
    return {
      id: row.id,
      providerId: row.provider_id,
      name: row.name,
      contextWindow: row.context_window || 4096,
      maxOutputTokens: row.max_output_tokens || 4096,
      supportsVision: Boolean(row.supports_vision),
      supportsTools: row.supports_tools !== 0,
      enabled: Boolean(row.enabled),
    };
  }
}

export const configService = new ConfigService();