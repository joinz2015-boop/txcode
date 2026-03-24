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
 * dbService.init();
 * const result = dbService.run('SELECT * FROM users');
 * ```
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DbService {
  /** 数据库实例，延迟初始化 */
  private db: Database.Database | null = null;
  
  /** 数据库文件路径 */
  private dbPath: string;

  constructor(dbPath?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const txcodeDir = path.join(home, '.txcode');
    
    if (!fs.existsSync(txcodeDir)) {
      fs.mkdirSync(txcodeDir, { recursive: true });
    }

    this.dbPath = dbPath || path.join(txcodeDir, 'data.db');
  }

  /**
   * 初始化数据库
   * 
   * 执行操作：
   * 1. 创建数据库连接
   * 2. 设置 WAL 模式
   * 3. 启用外键约束
   * 4. 执行迁移
   */
  init(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.runMigrations();
  }

  /**
   * 重置数据库（仅用于测试）
   */
  reset(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.init();
  }

  /**
   * 获取数据库实例
   * 
   * @returns 数据库实例
   * @throws 如果未初始化则抛出错误
   */
  getDb(): Database.Database {
    if (!this.db) {
      this.init();
    }
    return this.db!;
  }

  /**
   * 执行 SQL 语句
   * 
   * @param sql - SQL 语句
   * @param params - 参数数组
   * @returns 执行结果
   */
  run(sql: string, params?: unknown[]): Database.RunResult {
    if (params && params.length > 0) {
      return this.getDb().prepare(sql).run(...params);
    }
    return this.getDb().prepare(sql).run();
  }

  /**
   * 查询单条记录
   * 
   * @param sql - SQL 语句
   * @param params - 参数数组
   * @returns 查询结果，未找到返回 undefined
   */
  get<T>(sql: string, params?: unknown[]): T | undefined {
    if (params && params.length > 0) {
      return this.getDb().prepare(sql).get(...params) as T | undefined;
    }
    return this.getDb().prepare(sql).get() as T | undefined;
  }

  /**
   * 查询多条记录
   * 
   * @param sql - SQL 语句
   * @param params - 参数数组
   * @returns 查询结果数组
   */
  all<T>(sql: string, params?: unknown[]): T[] {
    if (params && params.length > 0) {
      return this.getDb().prepare(sql).all(...params) as T[];
    }
    return this.getDb().prepare(sql).all() as T[];
  }

  /**
   * 执行事务
   * 
   * @param fn - 事务函数
   * @returns 事务返回值
   */
  transaction<T>(fn: () => T): T {
    return this.getDb().transaction(fn)();
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 执行数据库迁移
   * 
   * 迁移表结构：
   * - migrations: 记录已执行的迁移
   */
  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
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
    ];

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      const migrationId = i + 1;
      
      const applied = this.db.prepare(
        'SELECT 1 FROM migrations WHERE id = ?'
      ).get(migrationId);

      if (!applied) {
        migration();
        this.db.prepare(
          'INSERT INTO migrations (id, name) VALUES (?, ?)'
        ).run(migrationId, migration.name);
      }
    }
  }

  /** 初始迁移：创建所有基础表 */
  private migration001Initial(): void {
    if (!this.db) return;

    // 会话表
    this.db.exec(`
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

    // 消息表（包含永久/临时记忆标记）
    this.db.exec(`
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

    // 项目知识表
    this.db.exec(`
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

    // 代码片段表
    this.db.exec(`
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

    // 服务商表
    this.db.exec(`
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

    // 模型表
    this.db.exec(`
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

    // 配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_keep_context ON messages(session_id, keep_context);
      CREATE INDEX IF NOT EXISTS idx_project_knowledge_path ON project_knowledge(project_path);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_session ON code_snippets(session_id);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_summary ON sessions(summary_message_id);
    `);

    // 初始化默认配置
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxToolIterations', '10')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxSessionCompression', '5')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('web.port', '40000')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.mode', '"fixed"')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.maxTokens', '10000')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.percentage', '0.95')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.autoCompact', 'true')`);
  }

  /** 迁移002：添加上下文压缩相关字段 */
  private migration002AddContextFields(): void {
    if (!this.db) return;

    // 检查 sessions 表是否需要添加新字段
    const sessionsInfo = this.db.pragma('table_info(sessions)') as { name: string }[];
    const sessionsColumns = sessionsInfo.map(col => col.name);

    if (!sessionsColumns.includes('summary_message_id')) {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN summary_message_id INTEGER`);
    }
    if (!sessionsColumns.includes('prompt_tokens')) {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN prompt_tokens INTEGER DEFAULT 0`);
    }
    if (!sessionsColumns.includes('completion_tokens')) {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN completion_tokens INTEGER DEFAULT 0`);
    }
    if (!sessionsColumns.includes('cost')) {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN cost REAL DEFAULT 0`);
    }

    // 检查 messages 表是否需要迁移 is_permanent 到 keep_context
    const messagesInfo = this.db.pragma('table_info(messages)') as { name: string }[];
    const messagesColumns = messagesInfo.map(col => col.name);

    // 如果有 is_permanent 但没有 keep_context，重命名
    if (messagesColumns.includes('is_permanent') && !messagesColumns.includes('keep_context')) {
      this.db.exec(`ALTER TABLE messages RENAME COLUMN is_permanent TO keep_context`);
    } else if (!messagesColumns.includes('keep_context')) {
      this.db.exec(`ALTER TABLE messages ADD COLUMN keep_context INTEGER DEFAULT 1`);
    }

    // 检查 models 表是否需要添加新字段
    const modelsInfo = this.db.pragma('table_info(models)') as { name: string }[];
    const modelsColumns = modelsInfo.map(col => col.name);

    if (!modelsColumns.includes('context_window')) {
      this.db.exec(`ALTER TABLE models ADD COLUMN context_window INTEGER DEFAULT 4096`);
    }
    if (!modelsColumns.includes('max_output_tokens')) {
      this.db.exec(`ALTER TABLE models ADD COLUMN max_output_tokens INTEGER DEFAULT 4096`);
    }
    if (!modelsColumns.includes('supports_vision')) {
      this.db.exec(`ALTER TABLE models ADD COLUMN supports_vision INTEGER DEFAULT 0`);
    }
    if (!modelsColumns.includes('supports_tools')) {
      this.db.exec(`ALTER TABLE models ADD COLUMN supports_tools INTEGER DEFAULT 1`);
    }

    // 创建索引
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_summary ON sessions(summary_message_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_keep_context ON messages(session_id, keep_context)`);

    // 初始化默认配置
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.mode', '"fixed"')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.maxTokens', '10000')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.percentage', '0.95')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.context.autoCompact', 'true')`);

    // 初始化常用模型的 context_window
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

  /** 迁移003：添加 LSP 服务器表 */
  private migration003AddLspServers(): void {
    if (!this.db) return;

    this.db.exec(`
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
      this.db!.prepare(
        "INSERT OR IGNORE INTO lsp_server (id, enabled, auto_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run(server.id, server.enabled, server.auto_start, now, now);
    }
  }

  /** 迁移004：添加项目表 */
  private migration004AddProjects(): void {
    if (!this.db) return;

    this.db.exec(`
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

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active)`);
  }
}

/** 单例导出 */
export const dbService = new DbService();