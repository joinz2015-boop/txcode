import { BaseRepository } from './base.repository.js';

export interface EmailConfigRow {
  id: number;
  name: string;
  host: string;
  port: number;
  secure: number;
  user: string;
  password: string;
  from_name: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export class EmailRepository extends BaseRepository {
  create(config: { name: string; host: string; port: number; secure: number; user: string; password: string; from_name?: string; is_default?: number }): number {
    const result = this.execute(
      `INSERT INTO email_config (name, host, port, secure, user, password, from_name, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.name, config.host, config.port, config.secure, config.user, config.password, config.from_name || null, config.is_default || 0]
    );
    return result.lastInsertRowid;
  }

  update(id: number, config: Partial<{ name: string; host: string; port: number; secure: number; user: string; password: string; from_name: string; is_default: number }>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (config.name !== undefined) { fields.push('name = ?'); values.push(config.name); }
    if (config.host !== undefined) { fields.push('host = ?'); values.push(config.host); }
    if (config.port !== undefined) { fields.push('port = ?'); values.push(config.port); }
    if (config.secure !== undefined) { fields.push('secure = ?'); values.push(config.secure); }
    if (config.user !== undefined) { fields.push('user = ?'); values.push(config.user); }
    if (config.password !== undefined) { fields.push('password = ?'); values.push(config.password); }
    if (config.from_name !== undefined) { fields.push('from_name = ?'); values.push(config.from_name); }
    if (config.is_default !== undefined) { fields.push('is_default = ?'); values.push(config.is_default); }
    if (fields.length === 0) return false;
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    this.execute(`UPDATE email_config SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  }

  delete(id: number): boolean {
    this.execute('DELETE FROM email_config WHERE id = ?', [id]);
    return true;
  }

  findById(id: number): EmailConfigRow | undefined {
    return this.queryOne<EmailConfigRow>('SELECT * FROM email_config WHERE id = ?', [id]) || undefined;
  }

  findAll(): EmailConfigRow[] {
    return this.query<EmailConfigRow>('SELECT * FROM email_config ORDER BY created_at DESC');
  }

  findDefault(): EmailConfigRow | undefined {
    return this.queryOne<EmailConfigRow>('SELECT * FROM email_config WHERE is_default = 1') || undefined;
  }

  setDefault(id: number): boolean {
    this.execute('UPDATE email_config SET is_default = 0');
    this.execute('UPDATE email_config SET is_default = 1 WHERE id = ?', [id]);
    return true;
  }
}

export const emailRepository = new EmailRepository();
