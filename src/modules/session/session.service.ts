/**
 * Session 服务
 * 
 * 职责：
 * - 会话 CRUD
 * - 会话切换
 * - 当前会话状态管理
 */

import { v4 as uuidv4 } from 'uuid';
import { DbService, dbService as defaultDbService } from '../db/db.service.js';
import { Session, SessionState } from './session.types.js';

export class SessionService {
  private db: DbService;
  
  /** 当前会话状态 */
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

  /**
   * 切换当前会话
   * 
   * @param id - 会话 ID
   * @returns 切换后的会话，失败返回 undefined
   */
  switchTo(id: string): Session | undefined {
    const session = this.get(id);
    if (!session) return undefined;
    
    this.state.currentSessionId = id;
    this.touch(id);
    return session;
  }

  /**
   * 获取当前会话
   */
  getCurrent(): Session | undefined {
    if (!this.state.currentSessionId) return undefined;
    return this.get(this.state.currentSessionId);
  }

  /**
   * 获取当前会话 ID
   */
  getCurrentId(): string | null {
    return this.state.currentSessionId;
  }

  /**
   * 获取最近的会话
   * 
   * @param limit - 返回数量限制
   */
  getRecent(limit: number = 10): Session[] {
    const rows = this.db.all<any>(
      'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(this.rowToSession);
  }

  /**
   * 搜索会话
   * 
   * @param query - 搜索关键词
   */
  search(query: string): Session[] {
    const rows = this.db.all<any>(
      "SELECT * FROM sessions WHERE title LIKE ? OR project_path LIKE ? ORDER BY updated_at DESC",
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(this.rowToSession);
  }

  /**
   * 清除当前会话
   */
  clearCurrent(): void {
    this.state.currentSessionId = null;
  }

  /**
   * 获取会话状态
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * 根据项目路径获取或创建会话
   */
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

  private rowToSession(row: any): Session {
    return {
      id: row.id,
      title: row.title,
      projectPath: row.project_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const sessionService = new SessionService();