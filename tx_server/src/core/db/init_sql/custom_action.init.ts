import type { Database as SqlJsDatabase } from 'sql.js';

export function initCustomActionTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL CHECK(action_type IN ('design', 'code', 'test')),
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      auto_send INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
