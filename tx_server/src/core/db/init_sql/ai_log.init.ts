import type { Database as SqlJsDatabase } from 'sql.js';

export function initAiLogTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_address TEXT NOT NULL,
      model_name TEXT NOT NULL,
      request_time DATETIME DEFAULT (datetime('now', 'localtime')),
      response_time DATETIME,
      duration_ms INTEGER DEFAULT 0,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      call_type TEXT NOT NULL CHECK (call_type IN ('tool_call', 'normal')),
      session_id TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_request_time ON ai_call_logs(request_time)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id ON ai_call_logs(session_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_call_type ON ai_call_logs(call_type)`);
}
