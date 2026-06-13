import { BaseRepository } from './base.repository.js';

export interface ProjectKnowledgeRow {
  id: number;
  project_path: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export class MemoryRepository extends BaseRepository {
  get(projectPath: string, key: string): ProjectKnowledgeRow | undefined {
    return this.queryOne<ProjectKnowledgeRow>(
      'SELECT * FROM project_knowledge WHERE project_path = ? AND key = ?',
      [projectPath, key]
    ) || undefined;
  }

  getByProject(projectPath: string): ProjectKnowledgeRow[] {
    return this.query<ProjectKnowledgeRow>(
      'SELECT * FROM project_knowledge WHERE project_path = ? ORDER BY key',
      [projectPath]
    );
  }

  set(projectPath: string, key: string, value: string): void {
    this.execute(
      `INSERT INTO project_knowledge (project_path, key, value) VALUES (?, ?, ?)
       ON CONFLICT(project_path, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [projectPath, key, value]
    );
  }

  delete(projectPath: string, key: string): void {
    this.execute('DELETE FROM project_knowledge WHERE project_path = ? AND key = ?', [projectPath, key]);
  }
}

export const memoryRepository = new MemoryRepository();
