import type { Database as SqlJsDatabase } from 'sql.js';

export function initConfigTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS proxy_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER DEFAULT 0,
      type TEXT DEFAULT 'http',
      host TEXT DEFAULT '',
      port INTEGER DEFAULT 1080,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`INSERT OR IGNORE INTO proxy_config (id) VALUES (1)`);

  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxToolIterations', '10')`);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxSessionCompression', '5')`);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('web.port', '40000')`);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.mode', '"fixed"')`);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.maxTokens', '100000')`);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.percentage', '0.95')`);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.autoCompact', 'true')`);
}
