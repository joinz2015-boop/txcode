import type { Database as SqlJsDatabase } from 'sql.js';

export function initWafGatewayTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS waf_gateway_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      secret_key TEXT DEFAULT '',
      server_ip TEXT DEFAULT '',
      status TEXT DEFAULT 'stopped',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`INSERT OR IGNORE INTO waf_gateway_config (id) VALUES (1)`);
}
