import { BaseRepository } from './base.repository.js';

export interface MessageRow {
  id: number;
  session_id: string;
  role: string;
  content: string;
  keep_context: number;
  is_original: number;
  created_at: string;
}

export class MessageRepository extends BaseRepository {
  insert(data: { sessionId: string; role: string; content: string; keepContext?: boolean; isOriginal?: boolean }): number {
    const result = this.execute(
      'INSERT INTO messages (session_id, role, content, keep_context, is_original) VALUES (?, ?, ?, ?, ?)',
      [data.sessionId, data.role, data.content, data.keepContext !== false ? 1 : 0, data.isOriginal ? 1 : 0]
    );
    return Number(result.lastInsertRowid);
  }

  getById(id: number): MessageRow | undefined {
    return this.queryOne<MessageRow>('SELECT * FROM messages WHERE id = ?', [id]) || undefined;
  }

  getAll(sessionId: string): MessageRow[] {
    return this.query<MessageRow>('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at', [sessionId]);
  }

  getPermanent(sessionId: string): MessageRow[] {
    return this.query<MessageRow>(
      'SELECT * FROM messages WHERE session_id = ? AND keep_context = 1 ORDER BY created_at',
      [sessionId]
    );
  }

  getTemporary(sessionId: string): MessageRow[] {
    return this.query<MessageRow>(
      'SELECT * FROM messages WHERE session_id = ? AND keep_context = 0 ORDER BY created_at',
      [sessionId]
    );
  }

  getFromId(sessionId: string, fromId: number, keepContextOnly: boolean): MessageRow[] {
    let sql = 'SELECT * FROM messages WHERE session_id = ? AND id >= ?';
    const params: unknown[] = [sessionId, fromId];
    if (keepContextOnly) {
      sql += ' AND keep_context = 1';
    }
    sql += ' ORDER BY id ASC';
    return this.query<MessageRow>(sql, params);
  }

  deleteById(id: number): void {
    this.execute('DELETE FROM messages WHERE id = ?', [id]);
  }

  deleteBefore(sessionId: string, beforeId: number): void {
    const msg = this.queryOne<MessageRow>('SELECT created_at FROM messages WHERE id = ?', [beforeId]);
    if (msg) {
      this.execute('DELETE FROM messages WHERE session_id = ? AND created_at < ?', [sessionId, msg.created_at]);
    }
  }

  compressSession(sessionId: string, keepCount: number): void {
    const messages = this.query<{ id: number }>(
      'SELECT id FROM messages WHERE session_id = ? AND keep_context = 1 ORDER BY created_at DESC',
      [sessionId]
    );
    if (messages.length > keepCount) {
      const toDelete = messages.slice(keepCount).map(m => m.id);
      const placeholders = toDelete.map(() => '?').join(',');
      this.execute(`DELETE FROM messages WHERE id IN (${placeholders})`, toDelete);
    }
  }

  countBySession(sessionId: string): number {
    const row = this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM messages WHERE session_id = ?', [sessionId]);
    return row?.count || 0;
  }

  countPermanent(sessionId: string): number {
    const row = this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND keep_context = 1',
      [sessionId]
    );
    return row?.count || 0;
  }

  deleteBySession(sessionId: string): void {
    this.execute('DELETE FROM messages WHERE session_id = ?', [sessionId]);
  }
}

export const messageRepository = new MessageRepository();
