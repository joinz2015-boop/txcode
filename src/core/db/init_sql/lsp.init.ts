import type { Database as SqlJsDatabase } from 'sql.js';

export function initLspTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS lsp_server (
      id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      auto_start INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  const now = Date.now();
  const defaultServers = [
    { id: "typescript", enabled: 1, auto_start: 1 },
    { id: "python", enabled: 1, auto_start: 1 },
    { id: "java", enabled: 1, auto_start: 1 },
    { id: "cpp", enabled: 0, auto_start: 0 },
  ];

  for (const server of defaultServers) {
    db.run(
      "INSERT OR IGNORE INTO lsp_server (id, enabled, auto_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [server.id, server.enabled, server.auto_start, now, now]
    );
  }
}
