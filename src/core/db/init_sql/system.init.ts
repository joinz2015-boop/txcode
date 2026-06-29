import type { Database as SqlJsDatabase } from 'sql.js';

export function initSystemTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS tx_system (
      id INTEGER PRIMARY KEY DEFAULT 1,
      device_id TEXT NOT NULL,
      device_type TEXT NOT NULL DEFAULT 'unknown',
      mac_address TEXT NOT NULL DEFAULT '',
      platform_account TEXT NOT NULL DEFAULT '',
      platform_password TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
