import { dbService } from '../db/db.service.js'
import { EmailConfig } from './email.types.js'

export class EmailConfigRepository {
  create(config: Omit<EmailConfig, 'id' | 'created_at' | 'updated_at'>): { id: number } {
    const result = dbService.run(
      `INSERT INTO email_config (name, host, port, secure, user, password, from_name, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.name, config.host, config.port, config.secure, config.user, config.password, config.from_name || null, config.is_default]
    )
    return { id: result.lastInsertRowid }
  }

  update(id: number, config: Partial<EmailConfig>): boolean {
    const fields: string[] = []
    const values: unknown[] = []

    if (config.name !== undefined) { fields.push('name = ?'); values.push(config.name) }
    if (config.host !== undefined) { fields.push('host = ?'); values.push(config.host) }
    if (config.port !== undefined) { fields.push('port = ?'); values.push(config.port) }
    if (config.secure !== undefined) { fields.push('secure = ?'); values.push(config.secure) }
    if (config.user !== undefined) { fields.push('user = ?'); values.push(config.user) }
    if (config.password !== undefined) { fields.push('password = ?'); values.push(config.password) }
    if (config.from_name !== undefined) { fields.push('from_name = ?'); values.push(config.from_name) }
    if (config.is_default !== undefined) { fields.push('is_default = ?'); values.push(config.is_default) }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = dbService.run(
      `UPDATE email_config SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return result.changes > 0
  }

  delete(id: number): boolean {
    const result = dbService.run('DELETE FROM email_config WHERE id = ?', [id])
    return result.changes > 0
  }

  findById(id: number): EmailConfig | undefined {
    return dbService.get<EmailConfig>('SELECT * FROM email_config WHERE id = ?', [id])
  }

  findAll(): EmailConfig[] {
    return dbService.all<EmailConfig>('SELECT * FROM email_config ORDER BY created_at DESC')
  }

  findDefault(): EmailConfig | undefined {
    return dbService.get<EmailConfig>('SELECT * FROM email_config WHERE is_default = 1')
  }

  setDefault(id: number): boolean {
    dbService.run('UPDATE email_config SET is_default = 0')
    const result = dbService.run('UPDATE email_config SET is_default = 1 WHERE id = ?', [id])
    return result.changes > 0
  }
}

export const emailConfigRepository = new EmailConfigRepository()
