import type { Database as SqlJsDatabase } from 'sql.js';

export function initDingdingTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS dingding_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER DEFAULT 0,
      client_id TEXT DEFAULT '',
      client_secret TEXT DEFAULT '',
      bot_name TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`INSERT OR IGNORE INTO dingding_config (id) VALUES (1)`);
}
