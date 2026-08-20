import type { Database as SqlJsDatabase } from 'sql.js';

export function initMessageFileTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages_file (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'image/png',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_file_message_id ON messages_file(message_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_file_session_id ON messages_file(session_id)`);
}
