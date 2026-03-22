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
        is_permanent INTEGER DEFAULT 0,
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
      CREATE INDEX IF NOT EXISTS idx_messages_permanent ON messages(session_id, is_permanent);
      CREATE INDEX IF NOT EXISTS idx_project_knowledge_path ON project_knowledge(project_path);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_session ON code_snippets(session_id);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
    `);

    // 初始化默认配置
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxToolIterations', '10')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxSessionCompression', '5')`);
    this.db.exec(`INSERT OR IGNORE INTO config (key, value) VALUES ('web.port', '40000')`);
  }
}

/** 单例导出 */
export const dbService = new DbService();