import { BaseRepository } from './base.repository.js';

export interface SpecRepoRow {
  id: number;
  name: string;
  url: string;
  branch: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export class SpecRepository extends BaseRepository {
  list(): SpecRepoRow[] {
    return this.query<SpecRepoRow>('SELECT * FROM spec_repositories ORDER BY created_at');
  }

  getByName(name: string): SpecRepoRow | undefined {
    return this.queryOne<SpecRepoRow>('SELECT * FROM spec_repositories WHERE name = ?', [name]) || undefined;
  }

  getById(id: number): SpecRepoRow | undefined {
    return this.queryOne<SpecRepoRow>('SELECT * FROM spec_repositories WHERE id = ?', [id]) || undefined;
  }

  create(data: { name: string; url: string; branch?: string; enabled?: boolean }): number {
    const result = this.execute(
      'INSERT INTO spec_repositories (name, url, branch, enabled) VALUES (?, ?, ?, ?)',
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
      this.execute(`UPDATE spec_repositories SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: number): void {
    this.execute('DELETE FROM spec_repositories WHERE id = ?', [id]);
  }
}

export const specRepository = new SpecRepository();
