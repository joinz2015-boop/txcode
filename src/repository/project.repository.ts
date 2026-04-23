import { BaseRepository } from './base.repository.js';

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
  is_active: number;
  is_favorite: number;
  last_opened_at: string;
}

export class ProjectRepository extends BaseRepository {

  findAll(): Project[] {
    const sql = `SELECT * FROM projects ORDER BY last_opened_at DESC`;
    return this.query<Project>(sql);
  }

  findById(id: string | string[]): Project | null {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const sql = `SELECT * FROM projects WHERE id = ?`;
    return this.queryOne<Project>(sql, [normalizedId]);
  }

  findByPath(projectPath: string): Project | null {
    const sql = `SELECT * FROM projects WHERE path = ?`;
    return this.queryOne<Project>(sql, [projectPath]);
  }

  findActive(): Project | null {
    const sql = `SELECT * FROM projects WHERE is_active = 1`;
    return this.queryOne<Project>(sql);
  }

  insert(data: { name: string; path: string; description?: string }): Project {
    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO projects (id, name, path, description, is_active, is_favorite, last_opened_at)
      VALUES (?, ?, ?, ?, 1, 0, datetime('now'))
    `;
    this.execute(sql, [id, data.name, data.path, data.description || '']);
    const result = this.findById(id);
    if (!result) throw new Error('Failed to create project');
    return result;
  }

  setActive(id: string): void {
    this.execute(`UPDATE projects SET is_active = 0`);
    this.execute(`UPDATE projects SET is_active = 1, last_opened_at = datetime('now') WHERE id = ?`, [id]);
  }

  delete(id: string | string[]): void {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const sql = `DELETE FROM projects WHERE id = ?`;
    this.execute(sql, [normalizedId]);
  }
}

export const projectRepository = new ProjectRepository();