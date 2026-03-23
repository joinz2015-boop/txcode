/**
 * Session 服务
 * 
 * 职责：
 * - 会话 CRUD
 * - 会话切换
 * - 当前会话状态管理
 * - Token 统计
 * - 上下文压缩
 */

import { v4 as uuidv4 } from 'uuid';
import { DbService, dbService as defaultDbService } from '../db/db.service.js';
import { Session, SessionState, CompactionResult, SessionStats } from './session.types.js';
import { Message } from '../memory/memory.types.js';

export class SessionService {
  private db: DbService;
  
  private state: SessionState = {
    currentSessionId: null,
    sessions: [],
  };

  constructor(db?: DbService) {
    this.db = db || defaultDbService;
  }

  create(title: string, projectPath?: string): Session {
    const id = uuidv4();
    this.db.run(
      'INSERT INTO sessions (id, title, project_path) VALUES (?, ?, ?)',
      [id, title, projectPath || null]
    );
    const session = this.get(id)!;
    
    this.state.sessions.unshift(session);
    return session;
  }

  get(id: string): Session | undefined {
    const row = this.db.get<any>('SELECT * FROM sessions WHERE id = ?', [id]);
    return row ? this.rowToSession(row) : undefined;
  }

  getAll(): Session[] {
    const rows = this.db.all<any>('SELECT * FROM sessions ORDER BY updated_at DESC');
    this.state.sessions = rows.map(this.rowToSession);
    return this.state.sessions;
  }

  update(id: string, data: Partial<Pick<Session, 'title' | 'projectPath'>>): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.projectPath !== undefined) {
      updates.push('project_path = ?');
      values.push(data.projectPath);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.db.run(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`, values);
      
      const index = this.state.sessions.findIndex(s => s.id === id);
      if (index !== -1) {
        this.state.sessions[index] = this.get(id)!;
      }
    }
  }

  delete(id: string): void {
    this.db.run('DELETE FROM sessions WHERE id = ?', [id]);
    
    if (this.state.currentSessionId === id) {
      this.state.currentSessionId = null;
    }
    
    this.state.sessions = this.state.sessions.filter(s => s.id !== id);
  }

  touch(id: string): void {
    this.db.run('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  switchTo(id: string): Session | undefined {
    const session = this.get(id);
    if (!session) return undefined;
    
    this.state.currentSessionId = id;
    this.touch(id);
    return session;
  }

  getCurrent(): Session | undefined {
    if (!this.state.currentSessionId) return undefined;
    return this.get(this.state.currentSessionId);
  }

  getCurrentId(): string | null {
    return this.state.currentSessionId;
  }

  getRecent(limit: number = 10): Session[] {
    const rows = this.db.all<any>(
      'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(this.rowToSession);
  }

  search(query: string): Session[] {
    const rows = this.db.all<any>(
      "SELECT * FROM sessions WHERE title LIKE ? OR project_path LIKE ? ORDER BY updated_at DESC",
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(this.rowToSession);
  }

  clearCurrent(): void {
    this.state.currentSessionId = null;
  }

  getState(): SessionState {
    return { ...this.state };
  }

  getOrCreateByPath(projectPath: string, title?: string): Session {
    const existing = this.db.get<any>(
      'SELECT * FROM sessions WHERE project_path = ? ORDER BY updated_at DESC LIMIT 1',
      [projectPath]
    );
    
    if (existing) {
      return this.rowToSession(existing);
    }
    
    return this.create(title || `Session for ${projectPath}`, projectPath);
  }

  updateTokenUsage(
    sessionId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number = 0
  ): void {
    this.db.run(
      `UPDATE sessions 
       SET prompt_tokens = prompt_tokens + ?,
           completion_tokens = completion_tokens + ?,
           cost = cost + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [promptTokens, completionTokens, cost, sessionId]
    );
  }

  updateSummary(sessionId: string, summaryMessageId: number): void {
    this.db.run(
      `UPDATE sessions 
       SET summary_message_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [summaryMessageId, sessionId]
    );
  }

  resetTokens(sessionId: string): void {
    this.db.run(
      `UPDATE sessions 
       SET prompt_tokens = 0,
           completion_tokens = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId]
    );
  }

  getStats(sessionId: string, threshold: number): SessionStats {
    const session = this.get(sessionId);
    if (!session) {
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        threshold,
        percentUsed: 0,
        willCompact: false,
      };
    }

    const totalTokens = session.promptTokens + session.completionTokens;
    const percentUsed = threshold > 0 ? Math.round((totalTokens / threshold) * 100) : 0;

    return {
      promptTokens: session.promptTokens,
      completionTokens: session.completionTokens,
      totalTokens,
      threshold,
      percentUsed,
      willCompact: totalTokens >= threshold,
    };
  }

  private rowToSession(row: any): Session {
    return {
      id: row.id,
      title: row.title,
      projectPath: row.project_path,
      summaryMessageId: row.summary_message_id ?? null,
      promptTokens: row.prompt_tokens || 0,
      completionTokens: row.completion_tokens || 0,
      cost: row.cost || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const sessionService = new SessionService();