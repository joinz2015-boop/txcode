import { BaseRepository } from './base.repository.js';

export class SessionRepository extends BaseRepository {

  async save(session: {
    id: string;
    name: string;
    projectPath?: string;
    created_at?: string;
  }): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO sessions (id, name, project_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    await this.execute(sql, [
      session.id,
      session.name,
      session.projectPath || null,
      session.created_at || new Date().toISOString()
    ]);
  }

  async getById(id: string): Promise<any | null> {
    const sql = `SELECT * FROM sessions WHERE id = ?`;
    return this.queryOne(sql, [id]);
  }

  async getAll(): Promise<any[]> {
    const sql = `SELECT * FROM sessions ORDER BY updated_at DESC`;
    return this.query(sql);
  }

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM sessions WHERE id = ?`;
    await this.execute(sql, [id]);
  }

  async updateUpdatedAt(id: string): Promise<void> {
    const sql = `UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`;
    await this.execute(sql, [id]);
  }
}

export const sessionRepository = new SessionRepository();
