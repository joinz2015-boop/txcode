import type { Database as SqlJsDatabase } from 'sql.js';

export function initProjectTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS project_knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_path, key)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      last_opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_project_knowledge_path ON project_knowledge(project_path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active)`);
}
