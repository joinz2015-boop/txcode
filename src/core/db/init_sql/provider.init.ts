import type { Database as SqlJsDatabase } from 'sql.js';

export function initProviderTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT DEFAULT 'https://api.openai.com/v1',
      enabled INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL,
      context_window INTEGER DEFAULT 4096,
      max_output_tokens INTEGER DEFAULT 4096,
      supports_vision INTEGER DEFAULT 0,
      supports_tools INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS provider_auth (
      id TEXT PRIMARY KEY,
      provider_name TEXT NOT NULL,
      key TEXT NOT NULL DEFAULT '',
      auth_url TEXT DEFAULT '',
      active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id)`);
}
