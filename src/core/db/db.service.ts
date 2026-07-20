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
import { initSessionTables } from './init_sql/session.init.js';
import { initProjectTables } from './init_sql/project.init.js';
import { initCodeSnippetTables } from './init_sql/code_snippet.init.js';
import { initProviderTables } from './init_sql/provider.init.js';
import { initConfigTables } from './init_sql/config.init.js';
import { initDingdingTables } from './init_sql/dingding.init.js';
import { initLspTables } from './init_sql/lsp.init.js';
import { initAiLogTables } from './init_sql/ai_log.init.js';
import { initSchedulerTables } from './init_sql/scheduler.init.js';
import { initEmailTables } from './init_sql/email.init.js';
import { initCustomActionTables } from './init_sql/custom_action.init.js';
import { initWafGatewayTables } from './init_sql/waf_gateway.init.js';
import { initSpecTables } from './init_sql/spec.init.js';
import { initZihaoTables } from './init_sql/zihao.init.js';
import { initMessageFileTables } from './init_sql/message_file.init.js';
import { initSystemTables } from './init_sql/system.init.js';
import { initHostTables } from './init_sql/host.init.js';

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
      this.save();
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
      this.save();
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

  vacuum(): void {
    this.getDb().run('VACUUM');
    this.save();
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


      () => this.migration014AddZihaoConfig(),
      () => this.migration015ProviderAuth(),
      () => this.migration016ProviderAuth(),
      () => this.migration017ProxyConfig(),
      () => this.migration018AddMessageFile(),
      () => this.migration019AddSystem(),
      () => this.migration020AddHosts(),
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
    initSessionTables(this.db);
    initProjectTables(this.db);
    initCodeSnippetTables(this.db);
    initProviderTables(this.db);
    initConfigTables(this.db);
    initDingdingTables(this.db);
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
      'gpt-4': 64000,
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
    initLspTables(this.db);
  }

  private migration004AddProjects(): void {
    if (!this.db) return;
    initProjectTables(this.db);
  }

  private migration005AddAiCallLogs(): void {
    if (!this.db) return;
    initAiLogTables(this.db);
  }

  private migration006AddDingdingConfig(): void {
    if (!this.db) return;
    initDingdingTables(this.db);
  }

  private migration007AddScheduledTasks(): void {
    if (!this.db) return;
    initSchedulerTables(this.db);
  }

  private migration008AddEmailConfig(): void {
    if (!this.db) return
    initEmailTables(this.db)
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
    initCustomActionTables(this.db)
  }

  private migration011AddWafGatewayConfig(): void {
    if (!this.db) return
    initWafGatewayTables(this.db)
  }

  private migration012AddSpecRepositories(): void {
    if (!this.db) return

    initSpecTables(this.db)

    const columns = this.getTableColumns('spec_repositories');
    if (!columns.includes('repo_path')) {
      this.db.run('ALTER TABLE spec_repositories ADD COLUMN repo_path TEXT');
    }
  }



  private migration014AddZihaoConfig(): void {
    if (!this.db) return
    initZihaoTables(this.db)
  }

  private migration015ProviderAuth(): void {
    if (!this.db) return
    initProviderTables(this.db)
  }

  private migration016ProviderAuth(): void {
    if (!this.db) return
    initProviderTables(this.db)
  }

  private migration017ProxyConfig(): void {
    if (!this.db) return
    initConfigTables(this.db)
  }

  private migration018AddMessageFile(): void {
    if (!this.db) return
    initMessageFileTables(this.db)
  }

  private migration019AddSystem(): void {
    if (!this.db) return
    initSystemTables(this.db)
  }

  private migration020AddHosts(): void {
    if (!this.db) return
    initHostTables(this.db)
  }

  private getTableColumns(tableName: string): string[] {
    const result = this.all<{ name: string }>(`PRAGMA table_info("${tableName}")`);
    return result.map(row => row.name);
  }
}

export const dbService = new DbService();
