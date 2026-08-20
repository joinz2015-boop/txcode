import type { Database as SqlJsDatabase } from 'sql.js';

export function initCodeSnippetTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS code_snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      lang TEXT NOT NULL,
      description TEXT,
      code TEXT NOT NULL,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_code_snippets_session ON code_snippets(session_id)`);
}
