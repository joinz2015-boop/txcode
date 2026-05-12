import { dbService } from '../modules/db/index.js';

export interface ZihaoConfig {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class ZihaoConfigRepository {
  findAll(): ZihaoConfig[] {
    return dbService.all<ZihaoConfig>('SELECT * FROM zihao_config ORDER BY created_at DESC');
  }

  findById(id: string): ZihaoConfig | undefined {
    return dbService.get<ZihaoConfig>('SELECT * FROM zihao_config WHERE id = ?', [id]);
  }

  findActive(): ZihaoConfig | undefined {
    return dbService.get<ZihaoConfig>('SELECT * FROM zihao_config WHERE is_active = 1 LIMIT 1');
  }

  insert(config: Omit<ZihaoConfig, 'created_at' | 'updated_at'>): ZihaoConfig {
    const now = new Date().toISOString();
    dbService.run(
      `INSERT INTO zihao_config (id, name, url, username, password, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.id, config.name, config.url, config.username, config.password, config.is_active, now, now]
    );
    return this.findById(config.id)!;
  }

  update(id: string, config: Partial<ZihaoConfig>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (config.name !== undefined) { sets.push('name = ?'); values.push(config.name); }
    if (config.url !== undefined) { sets.push('url = ?'); values.push(config.url); }
    if (config.username !== undefined) { sets.push('username = ?'); values.push(config.username); }
    if (config.password !== undefined) { sets.push('password = ?'); values.push(config.password); }
    if (config.is_active !== undefined) { sets.push('is_active = ?'); values.push(config.is_active); }

    if (sets.length > 0) {
      sets.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      dbService.run(`UPDATE zihao_config SET ${sets.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: string): void {
    dbService.run('DELETE FROM zihao_config WHERE id = ?', [id]);
  }

  setActive(id: string): void {
    dbService.run('UPDATE zihao_config SET is_active = 0');
    dbService.run('UPDATE zihao_config SET is_active = 1 WHERE id = ?', [id]);
  }
}

export const zihaoConfigRepository = new ZihaoConfigRepository();
