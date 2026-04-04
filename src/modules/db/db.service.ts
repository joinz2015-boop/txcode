/**
 * 数据库服务
 * 
 * 职责：
 * - 管理 SQLite 数据库连接
 * - 执行数据库迁移
 * - 提供基础的 CRUD 操作
 * 
 * 使用方式：
 * ```typescript
 * import { dbService } from './db.js';
 * await dbService.init();
 * const result = dbService.run('SELECT * FROM users');
 * ```
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';

export class DbService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(dbPath?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const txcodeDir = path.join(home, '.txcode');
    
    if (!fs.existsSync(txcodeDir)) {
      fs.mkdirSync(txcodeDir, { recursive: true });
    }

    this.dbPath = dbPath || path.join(txcodeDir, 'data.db');
  }

  async init(): Promise<void> {
    if (this.db) {
      this.db.close();
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON');
    this.runMigrations();
    this.save();
  }

  reset(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.init();
  }

  async refresh(): Promise<void> {
    this.save();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    const SQL = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }
    this.db.run('PRAGMA foreign_keys = ON');
  }

  getDb(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  run(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
    const db = this.getDb();

    if (params && params.length > 0) {
      db.run(sql, params as (string | number | null | Uint8Array)[]);
    } else {
      db.run(sql);
    }
    const changes = db.getRowsModified();
    const result = db.exec('SELECT last_insert_rowid() as lastId');
    const lastId = result.length > 0 && result[0].values.length > 0 ? Number(result[0].values[0][0]) : 0;
    this.saveLater();
    return { changes, lastInsertRowid: lastId };
  }

  get<T>(sql: string, params?: unknown[]): T | undefined {
    const db = this.getDb();
    let stmt;
    if (params && params.length > 0) {
      stmt = db.prepare(sql);
      stmt.bind(params as (string | number | null | Uint8Array)[]);
    } else {
      stmt = db.prepare(sql);
    }
    
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      stmt.free();
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      return row as T;
    }
    stmt.free();
    return undefined;
  }

  all<T>(sql: string, params?: unknown[]): T[] {
    const db = this.getDb();
    let stmt;
    if (params && params.length > 0) {
      stmt = db.prepare(sql);
      stmt.bind(params as (string | number | null | Uint8Array)[]);
    } else {
      stmt = db.prepare(sql);
    }

    const results: T[] = [];
    const columns = stmt.getColumnNames();
    
    while (stmt.step()) {
      const values = stmt.get();
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      results.push(row as T);
    }
    stmt.free();
    return results;
  }

  transaction<T>(fn: () => T): T {
    const db = this.getDb();
    db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      db.run('COMMIT');
      this.saveLater();
      return result;
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  private save(): void {
    if (!this.db || this.dbPath === ':memory:') return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  private saveLater(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.save();
      this.saveTimer = null;
    }, 100);
  }

  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrations: Array<() => void> = [
      () => this.migration001Initial(),
      () => this.migration002AddContextFields(),
      () => this.migration003AddLspServers(),
      () => this.migration004AddProjects(),
      () => this.migration005AddAiCallLogs(),
      () => this.migration006AddDingdingConfig(),
      () => this.migration007AddScheduledTasks(),
      () => this.migration008AddEmailConfig(),
      () => this.migration009AddSessionStatus(),
      () => this.migration010AddCustomActions(),
      () => this.migration011AddWafGatewayConfig(),
      () => this.migration012AddSpecRepositories(),
    ];

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      const migrationId = i + 1;
      
      const applied = this.get<{ 1: number }>(
        'SELECT 1 FROM migrations WHERE id = ?',
        [migrationId]
      );

      if (!applied) {
        migration();
        this.run(
          'INSERT INTO migrations (id, name) VALUES (?, ?)',
          [migrationId, `migration${String(migrationId).padStart(3, '0')}`]
        );
      }
    }
  }

  private migration001Initial(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        project_path TEXT,
        summary_message_id INTEGER,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        keep_context INTEGER DEFAULT 1,
        is_original INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS project_knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_path TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_path, key)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS code_snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        lang TEXT NOT NULL,
        description TEXT,
        code TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
      )
    `);

    this.db.run(`
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

    this.db.run(`
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

    this.db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS dingding_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER DEFAULT 0,
        client_id TEXT DEFAULT '',
        client_secret TEXT DEFAULT '',
        bot_name TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`INSERT OR IGNORE INTO dingding_config (id) VALUES (1)`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_messages_keep_context ON messages(session_id, keep_context)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_project_knowledge_path ON project_knowledge(project_path)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_code_snippets_session ON code_snippets(session_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_summary ON sessions(summary_message_id)`);

    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxToolIterations', '10')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxSessionCompression', '5')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('web.port', '40000')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.mode', '"fixed"')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.maxTokens', '100000')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.percentage', '0.95')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.autoCompact', 'true')`);
  }

  private migration002AddContextFields(): void {
    if (!this.db) return;

    const sessionsColumns = this.getTableColumns('sessions');

    if (!sessionsColumns.includes('summary_message_id')) {
      this.db.run(`ALTER TABLE sessions ADD COLUMN summary_message_id INTEGER`);
    }
    if (!sessionsColumns.includes('prompt_tokens')) {
      this.db.run(`ALTER TABLE sessions ADD COLUMN prompt_tokens INTEGER DEFAULT 0`);
    }
    if (!sessionsColumns.includes('completion_tokens')) {
      this.db.run(`ALTER TABLE sessions ADD COLUMN completion_tokens INTEGER DEFAULT 0`);
    }
    if (!sessionsColumns.includes('cost')) {
      this.db.run(`ALTER TABLE sessions ADD COLUMN cost REAL DEFAULT 0`);
    }

    const messagesColumns = this.getTableColumns('messages');

    if (messagesColumns.includes('is_permanent') && !messagesColumns.includes('keep_context')) {
      this.db.run(`ALTER TABLE messages RENAME COLUMN is_permanent TO keep_context`);
    } else if (!messagesColumns.includes('keep_context')) {
      this.db.run(`ALTER TABLE messages ADD COLUMN keep_context INTEGER DEFAULT 1`);
    }

    const modelsColumns = this.getTableColumns('models');

    if (!modelsColumns.includes('context_window')) {
      this.db.run(`ALTER TABLE models ADD COLUMN context_window INTEGER DEFAULT 4096`);
    }
    if (!modelsColumns.includes('max_output_tokens')) {
      this.db.run(`ALTER TABLE models ADD COLUMN max_output_tokens INTEGER DEFAULT 4096`);
    }
    if (!modelsColumns.includes('supports_vision')) {
      this.db.run(`ALTER TABLE models ADD COLUMN supports_vision INTEGER DEFAULT 0`);
    }
    if (!modelsColumns.includes('supports_tools')) {
      this.db.run(`ALTER TABLE models ADD COLUMN supports_tools INTEGER DEFAULT 1`);
    }

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_summary ON sessions(summary_message_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_messages_keep_context ON messages(session_id, keep_context)`);

    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.mode', '"fixed"')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.maxTokens', '10000')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.percentage', '0.95')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.autoCompact', 'true')`);

    const modelContextWindows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000,
      'claude-3.5-sonnet': 200000,
      'claude-4-sonnet': 200000,
      'claude-4-opus': 200000,
      'deepseek-chat': 64000,
      'deepseek-coder': 16000,
    };

    for (const [modelId, contextWindow] of Object.entries(modelContextWindows)) {
      this.run(
        `UPDATE models SET context_window = ? WHERE id = ?`,
        [contextWindow, modelId]
      );
    }
  }

  private migration003AddLspServers(): void {
    if (!this.db) return;

    this.db.run(`
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
      this.db.run(
        "INSERT OR IGNORE INTO lsp_server (id, enabled, auto_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [server.id, server.enabled, server.auto_start, now, now]
      );
    }
  }

  private migration004AddProjects(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        is_active INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        last_opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active)`);
  }

  private migration005AddAiCallLogs(): void {
    if (!this.db) return;

    this.db.run(`
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

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_request_time ON ai_call_logs(request_time)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id ON ai_call_logs(session_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_call_type ON ai_call_logs(call_type)`);
  }

  private migration006AddDingdingConfig(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS dingding_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER DEFAULT 0,
        client_id TEXT DEFAULT '',
        client_secret TEXT DEFAULT '',
        bot_name TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`INSERT OR IGNORE INTO dingding_config (id) VALUES (1)`);
  }

  private migration007AddScheduledTasks(): void {
    if (!this.db) return;

    this.db.run(`
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

    this.db.run(`
      CREATE TABLE IF NOT EXISTS task_skills (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        skill_order INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
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

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_task_skills_task_id ON task_skills(task_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_task_logs_executed_at ON task_logs(executed_at)`);
  }

  private migration008AddEmailConfig(): void {
    if (!this.db) return

    this.db.run(`
      CREATE TABLE IF NOT EXISTS email_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER DEFAULT 587,
        secure INTEGER DEFAULT 0,
        user TEXT NOT NULL,
        password TEXT NOT NULL,
        from_name TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  private migration009AddSessionStatus(): void {
    if (!this.db) return

    const columns = this.getTableColumns('sessions')
    if (!columns.includes('status')) {
      this.db.run(`ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'idle'`)
    }
  }

  private migration010AddCustomActions(): void {
    if (!this.db) return

    this.db.run(`
      CREATE TABLE IF NOT EXISTS custom_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL CHECK(action_type IN ('design', 'code', 'test')),
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        auto_send INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
  }

  private migration011AddWafGatewayConfig(): void {
    if (!this.db) return

    this.db.run(`
      CREATE TABLE IF NOT EXISTS waf_gateway_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        secret_key TEXT DEFAULT '',
        server_ip TEXT DEFAULT '',
        status TEXT DEFAULT 'stopped',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    this.db.run(`INSERT OR IGNORE INTO waf_gateway_config (id) VALUES (1)`)
  }

  private migration012AddSpecRepositories(): void {
    if (!this.db) return

    this.db.run(`
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
    `)

    const columns = this.getTableColumns('spec_repositories');
    if (!columns.includes('repo_path')) {
      this.db.run('ALTER TABLE spec_repositories ADD COLUMN repo_path TEXT');
    }

    this.db.run(`
      INSERT OR IGNORE INTO spec_repositories (id, name, url, type, repo_path)
      VALUES ('default', 'txcode官方规范库', 'https://gitee.com/homecommunity/txcode', 'default', '')
    `)
  }

  private getTableColumns(tableName: string): string[] {
    const result = this.all<{ name: string }>(`PRAGMA table_info("${tableName}")`);
    return result.map(row => row.name);
  }
}

export const dbService = new DbService();
