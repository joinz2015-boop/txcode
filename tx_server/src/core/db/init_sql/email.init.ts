import type { Database as SqlJsDatabase } from 'sql.js';

export function initEmailTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS email_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 587,
      secure INTEGER DEFAULT 0,
      user TEXT NOT NULL,
      password TEXT NOT NULL,
      from_name TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
