/**
 * OSS 配置 Repository
 * 
 * 职责：
 * - OSS配置的数据库CRUD操作
 */

import { dbService } from '../modules/db/index.js';

export interface OssConfig {
  id: string;
  name: string;
  endpoint: string;
  bucket: string;
  access_key_id: string;
  access_key_secret: string;
  region: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class OssRepository {
  findAll(): OssConfig[] {
    return dbService.all<OssConfig>('SELECT * FROM oss_config ORDER BY created_at DESC');
  }

  findById(id: string): OssConfig | undefined {
    return dbService.get<OssConfig>('SELECT * FROM oss_config WHERE id = ?', [id]);
  }

  findActive(): OssConfig | undefined {
    return dbService.get<OssConfig>('SELECT * FROM oss_config WHERE is_active = 1 LIMIT 1');
  }

  insert(config: Omit<OssConfig, 'created_at' | 'updated_at'>): OssConfig {
    const now = new Date().toISOString();
    dbService.run(
      `INSERT INTO oss_config (id, name, endpoint, bucket, access_key_id, access_key_secret, region, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.id, config.name, config.endpoint, config.bucket, config.access_key_id, config.access_key_secret, config.region, config.is_active, now, now]
    );
    return this.findById(config.id)!;
  }

  update(id: string, config: Partial<OssConfig>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (config.name !== undefined) {
      sets.push('name = ?');
      values.push(config.name);
    }
    if (config.endpoint !== undefined) {
      sets.push('endpoint = ?');
      values.push(config.endpoint);
    }
    if (config.bucket !== undefined) {
      sets.push('bucket = ?');
      values.push(config.bucket);
    }
    if (config.access_key_id !== undefined) {
      sets.push('access_key_id = ?');
      values.push(config.access_key_id);
    }
    if (config.access_key_secret !== undefined) {
      sets.push('access_key_secret = ?');
      values.push(config.access_key_secret);
    }
    if (config.region !== undefined) {
      sets.push('region = ?');
      values.push(config.region);
    }
    if (config.is_active !== undefined) {
      sets.push('is_active = ?');
      values.push(config.is_active);
    }

    if (sets.length > 0) {
      sets.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      dbService.run(`UPDATE oss_config SET ${sets.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: string): void {
    dbService.run('DELETE FROM oss_config WHERE id = ?', [id]);
  }

  setActive(id: string): void {
    dbService.run('UPDATE oss_config SET is_active = 0');
    dbService.run('UPDATE oss_config SET is_active = 1 WHERE id = ?', [id]);
  }
}

export const ossRepository = new OssRepository();