/**
 * Memory 服务
 * 
 * 职责：
 * - 管理会话消息（永久/临时记忆）
 * - 会话压缩
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
    isPermanent: boolean = false
  ): void {
    this.db.run(
      'INSERT INTO messages (session_id, role, content, is_permanent) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, isPermanent ? 1 : 0]
    );
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
      'SELECT * FROM messages WHERE session_id = ? AND is_permanent = 1 ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  getTemporaryMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? AND is_permanent = 0 ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  deleteMessage(id: number): void {
    this.db.run('DELETE FROM messages WHERE id = ?', [id]);
  }

  compressSession(sessionId: string, keepCount: number): void {
    this.db.transaction(() => {
      const messages = this.db.all<any>(
        'SELECT id FROM messages WHERE session_id = ? AND is_permanent = 1 ORDER BY created_at DESC',
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
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND is_permanent = 1',
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
      isPermanent: Boolean(row.is_permanent),
      createdAt: row.created_at,
    };
  }
}

export const memoryService = new MemoryService();