/**
 * Memory 服务
 * 
 * 职责：
 * - 管理会话消息（永久/临时记忆）
 * - 会话压缩支持
 * - 摘要消息管理
 */

import { DbService, dbService as defaultDbService } from '../db/db.service.js';
import { Message } from './memory.types.js';

export class MemoryService {
  private db: DbService;

  constructor(db?: DbService) {
    this.db = db || defaultDbService;
  }

  addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean = true
  ): number {
    const result = this.db.run(
      'INSERT INTO messages (session_id, role, content, keep_context) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, keepContext ? 1 : 0]
    );
    return Number(result.lastInsertRowid);
  }

  getMessage(id: number): Message | undefined {
    const row = this.db.get<any>('SELECT * FROM messages WHERE id = ?', [id]);
    return row ? this.rowToMessage(row) : undefined;
  }

  getAllMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  getPermanentMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? AND keep_context = 1 ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  getTemporaryMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? AND keep_context = 0 ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  getMessagesFrom(fromId: number, keepContextOnly: boolean = true): Message[] {
    const message = this.db.get<any>(
      'SELECT * FROM messages WHERE id = ?',
      [fromId]
    );

    if (!message) return [];

    let sql = 'SELECT * FROM messages WHERE session_id = ? AND id >= ?';
    const params: unknown[] = [message.session_id, fromId];

    if (keepContextOnly) {
      sql += ' AND keep_context = 1';
    }

    sql += ' ORDER BY id ASC';

    const rows = this.db.all<any>(sql, params);
    return rows.map(this.rowToMessage);
  }

  getMessagesForAI(sessionId: string, summaryMessageId: number | null): Message[] {
    let messages: Message[];

    if (summaryMessageId) {
      messages = this.getMessagesFrom(summaryMessageId, true);
      if (messages.length > 0 && messages[0].id === summaryMessageId) {
        messages[0] = {
          ...messages[0],
          role: 'user',
        };
      }
    } else {
      messages = this.getPermanentMessages(sessionId);
    }

    return messages;
  }

  deleteMessage(id: number): void {
    this.db.run('DELETE FROM messages WHERE id = ?', [id]);
  }

  deleteMessagesBefore(sessionId: string, beforeId: number): void {
    const message = this.db.get<any>(
      'SELECT created_at FROM messages WHERE id = ?',
      [beforeId]
    );
    if (message) {
      this.db.run(
        'DELETE FROM messages WHERE session_id = ? AND created_at < ?',
        [sessionId, message.created_at]
      );
    }
  }

  compressSession(sessionId: string, keepCount: number): void {
    this.db.transaction(() => {
      const messages = this.db.all<any>(
        'SELECT id FROM messages WHERE session_id = ? AND keep_context = 1 ORDER BY created_at DESC',
        [sessionId]
      );
      
      if (messages.length > keepCount) {
        const toDelete = messages.slice(keepCount).map((m: any) => m.id);
        if (toDelete.length > 0) {
          const placeholders = toDelete.map(() => '?').join(',');
          this.db.run(`DELETE FROM messages WHERE id IN (${placeholders})`, toDelete);
        }
      }
    });
  }

  getSessionStats(sessionId: string): { totalMessages: number; permanentMessages: number; compressedCount: number } {
    const total = this.db.get<{count: number}>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
      [sessionId]
    );
    const permanent = this.db.get<{count: number}>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND keep_context = 1',
      [sessionId]
    );
    return {
      totalMessages: total?.count || 0,
      permanentMessages: permanent?.count || 0,
      compressedCount: (total?.count || 0) - (permanent?.count || 0),
    };
  }

  private rowToMessage(row: any): Message {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      keepContext: Boolean(row.keep_context),
      createdAt: row.created_at,
    };
  }
}

export const memoryService = new MemoryService();