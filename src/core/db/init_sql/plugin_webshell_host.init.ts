import type { Database as SqlJsDatabase } from 'sql.js';

export function initPluginWebshellHostTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_webshell_hosts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}
