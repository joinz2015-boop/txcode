import type { Database as SqlJsDatabase } from 'sql.js';

export function initSpecTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS spec_repositories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'default',
      enabled INTEGER DEFAULT 1,
      repo_path TEXT,
      last_sync_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO spec_repositories (id, name, url, type, repo_path)
    VALUES ('default', 'txcode官方规范库', 'https://gitee.com/homecommunity/txcode', 'default', '')
  `);
}
