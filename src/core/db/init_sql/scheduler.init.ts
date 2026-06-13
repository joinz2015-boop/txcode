import type { Database as SqlJsDatabase } from 'sql.js';

export function initSchedulerTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      model TEXT NOT NULL,
      content TEXT NOT NULL,
      notify_type TEXT NOT NULL DEFAULT 'message',
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_skills (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      skill_order INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      prompt TEXT,
      result TEXT,
      error TEXT,
      duration INTEGER,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_task_skills_task_id ON task_skills(task_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_task_logs_executed_at ON task_logs(executed_at)`);
}
