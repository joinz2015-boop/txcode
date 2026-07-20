import type { Database as SqlJsDatabase } from 'sql.js';

export function initHostTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS hosts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 40000,
      is_local INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`INSERT OR IGNORE INTO hosts (id, name, ip, port, is_local, is_active) VALUES ('local', '本地开发', 'localhost', 40000, 1, 1)`);
}
