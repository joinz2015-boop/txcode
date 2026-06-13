import { BaseRepository } from './base.repository.js';
import type { SkillRepoRow } from '../entity/skill.entity.js';

export type { SkillRepoRow };

export class SkillRepository extends BaseRepository {
  list(): SkillRepoRow[] {
    return this.query<SkillRepoRow>('SELECT * FROM skill_repositories ORDER BY created_at');
  }

  getByName(name: string): SkillRepoRow | undefined {
    return this.queryOne<SkillRepoRow>('SELECT * FROM skill_repositories WHERE name = ?', [name]) || undefined;
  }

  getById(id: number): SkillRepoRow | undefined {
    return this.queryOne<SkillRepoRow>('SELECT * FROM skill_repositories WHERE id = ?', [id]) || undefined;
  }

  create(data: { name: string; url: string; branch?: string; enabled?: boolean }): number {
    const result = this.execute(
      'INSERT INTO skill_repositories (name, url, branch, enabled) VALUES (?, ?, ?, ?)',
      [data.name, data.url, data.branch || 'main', data.enabled ? 1 : 0]
    );
    return result.lastInsertRowid;
  }

  update(id: number, data: Partial<{ name: string; url: string; branch: string; enabled: boolean }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.branch !== undefined) { updates.push('branch = ?'); values.push(data.branch); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE skill_repositories SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: number): void {
    this.execute('DELETE FROM skill_repositories WHERE id = ?', [id]);
  }
}

export const skillRepository = new SkillRepository();
