import { BaseRepository } from './base.repository.js';
import type { MessageFileRow } from '../entity/message_file.entity.js';

export type { MessageFileRow };

export class MessageFileRepository extends BaseRepository {
  insert(data: { messageId: number; sessionId: string; filePath: string; fileType?: string }): number {
    const result = this.execute(
      'INSERT INTO messages_file (message_id, session_id, file_path, file_type) VALUES (?, ?, ?, ?)',
      [data.messageId, data.sessionId, data.filePath, data.fileType || 'image/png']
    );
    return Number(result.lastInsertRowid);
  }

  getById(id: number): MessageFileRow | undefined {
    return this.queryOne<MessageFileRow>('SELECT * FROM messages_file WHERE id = ?', [id]) || undefined;
  }

  getByMessageId(messageId: number): MessageFileRow[] {
    return this.query<MessageFileRow>('SELECT * FROM messages_file WHERE message_id = ?', [messageId]);
  }

  getBySessionId(sessionId: string): MessageFileRow[] {
    return this.query<MessageFileRow>('SELECT * FROM messages_file WHERE session_id = ? ORDER BY created_at', [sessionId]);
  }

  getByMessageIds(messageIds: number[]): MessageFileRow[] {
    if (messageIds.length === 0) return [];
    const placeholders = messageIds.map(() => '?').join(',');
    return this.query<MessageFileRow>(
      `SELECT * FROM messages_file WHERE message_id IN (${placeholders}) ORDER BY created_at`,
      messageIds
    );
  }

  deleteByMessageId(messageId: number): void {
    this.execute('DELETE FROM messages_file WHERE message_id = ?', [messageId]);
  }

  deleteBySessionId(sessionId: string): void {
    this.execute('DELETE FROM messages_file WHERE session_id = ?', [sessionId]);
  }
}

export const messageFileRepository = new MessageFileRepository();
