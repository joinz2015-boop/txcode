import { BaseRepository } from './base.repository.js';
import type { SessionRow } from '../entity/session.entity.js';

export type { SessionRow };

export class SessionRepository extends BaseRepository {
  insert(session: { id: string; title: string; projectPath?: string }): void {
    this.execute(
      'INSERT INTO sessions (id, title, project_path) VALUES (?, ?, ?)',
      [session.id, session.title, session.projectPath || null]
    );
  }

  getById(id: string): SessionRow | undefined {
    return this.queryOne<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]) || undefined;
  }

  getAll(): SessionRow[] {
    return this.query<SessionRow>('SELECT * FROM sessions ORDER BY updated_at DESC');
  }

  getRecent(limit: number): SessionRow[] {
    return this.query<SessionRow>('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?', [limit]);
  }

  search(query: string): SessionRow[] {
    return this.query<SessionRow>(
      "SELECT * FROM sessions WHERE title LIKE ? OR project_path LIKE ? ORDER BY updated_at DESC",
      [`%${query}%`, `%${query}%`]
    );
  }

  getByProjectPath(projectPath: string, limit: number, offset: number): SessionRow[] {
    return this.query<SessionRow>(
      'SELECT * FROM sessions WHERE project_path = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [projectPath, limit, offset]
    );
  }

  getFirstByProjectPath(projectPath: string): SessionRow | undefined {
    return this.queryOne<SessionRow>(
      'SELECT * FROM sessions WHERE project_path = ? ORDER BY updated_at DESC LIMIT 1',
      [projectPath]
    ) || undefined;
  }

  update(id: string, data: Partial<{ title: string; project_path: string; status: string }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.project_path !== undefined) { updates.push('project_path = ?'); values.push(data.project_path); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: string): void {
    this.execute('DELETE FROM messages WHERE session_id = ?', [id]);
    this.execute('DELETE FROM sessions WHERE id = ?', [id]);
  }

  touch(id: string): void {
    this.execute('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  updateTokenUsage(sessionId: string, promptTokens: number, completionTokens: number, cost: number): void {
    this.execute(
      `UPDATE sessions SET prompt_tokens = prompt_tokens + ?, completion_tokens = completion_tokens + ?,
       cost = cost + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [promptTokens, completionTokens, cost, sessionId]
    );
  }

  updateSummary(sessionId: string, summaryMessageId: number): void {
    this.execute(
      'UPDATE sessions SET summary_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [summaryMessageId, sessionId]
    );
  }

  resetTokens(sessionId: string): void {
    this.execute(
      'UPDATE sessions SET prompt_tokens = 0, completion_tokens = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );
  }

  getStaleProcessing(): SessionRow[] {
    return this.query<SessionRow>("SELECT id FROM sessions WHERE status = 'processing'");
  }

  resetAllProcessing(): void {
    this.execute("UPDATE sessions SET status = 'idle' WHERE status = 'processing'");
  }
}

export const sessionRepository = new SessionRepository();
