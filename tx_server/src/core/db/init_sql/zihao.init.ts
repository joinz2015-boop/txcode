import type { Database as SqlJsDatabase } from 'sql.js';

export function initZihaoTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS zihao_config (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
