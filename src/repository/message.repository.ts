import { BaseRepository } from './base.repository.js';

export class MessageRepository extends BaseRepository {

  async save(sessionId: string, role: string, content: string): Promise<void> {
    const sql = `
      INSERT INTO messages (session_id, role, content, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `;
    await this.execute(sql, [sessionId, role, content]);
  }

  async getHistory(sessionId: string, limit = 100): Promise<any[]> {
    const sql = `
      SELECT id, session_id, role, content, created_at
      FROM messages
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return this.query(sql, [sessionId, limit]);
  }

  async getBySessionId(sessionId: string): Promise<any[]> {
    const sql = `
      SELECT id, session_id, role, content, created_at
      FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `;
    return this.query(sql, [sessionId]);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    const sql = `DELETE FROM messages WHERE session_id = ?`;
    await this.execute(sql, [sessionId]);
  }
}

export const messageRepository = new MessageRepository();
