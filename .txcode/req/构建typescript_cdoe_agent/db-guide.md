# 数据库设计

## 1. DB 模块概述

DB 模块是统一的数据层，所有其他模块都通过 DB 模块访问 SQLite 数据库。

---

## 2. DB 模块结构

```
modules/db/
├── db.service.ts      # 数据库连接、初始化、迁移
├── db.types.ts        # 类型定义
├── migrations/        # 迁移脚本
│   └── 001_initial.ts
└── index.ts
```

---

## 3. 数据库文件位置

- **默认位置**: `~/.txcode/data.db`
- **项目位置**: 可配置，支持项目级数据库

---

## 4. SQLite Schema

```sql
-- 会话表
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  is_permanent INTEGER DEFAULT 0,  -- 0: 临时记忆 1: 永久记忆
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 项目知识表（长期记忆）
CREATE TABLE project_knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_path TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_path, key)
);

-- 代码片段表
CREATE TABLE code_snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  lang TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- AI 服务商配置表
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  base_url TEXT DEFAULT 'https://api.openai.com/v1',
  enabled INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 模型配置表
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 全局配置表
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_permanent ON messages(session_id, is_permanent);
CREATE INDEX idx_project_knowledge_path ON project_knowledge(project_path);
CREATE INDEX idx_code_snippets_session ON code_snippets(session_id);
CREATE INDEX idx_models_provider ON models(provider_id);
```

---

## 5. 记忆类型说明

| 字段 | 值 | 说明 |
|------|-----|------|
| `is_permanent` | 0 | 临时记忆，工具执行结果等，下一轮不再传递 |
| `is_permanent` | 1 | 永久记忆，用户对话等重要信息，会保留 |

### 5.1 记忆分类

| 消息类型 | is_permanent | 说明 |
|----------|-------------|------|
| user | 1 | 用户输入，永久 |
| assistant | 1 | AI 回复，永久 |
| system | 1 | 系统提示，永久 |
| tool | 0 | 工具执行结果，临时 |
| tool-permanent | 1 | 重要的工具结果，需标记为永久 |

### 5.2 AI 判断是否遗忘

在工具执行后，AI 需要判断结果是否重要：
- 如果重要，标记为永久记忆
- 如果不重要，保持临时记忆（下一轮不传递）

---

## 6. 配置文件

```json
{
  "ai": {
    "maxToolIterations": 10,
    "maxSessionCompression": 5
  }
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `maxToolIterations` | 工具执行最大轮数 | 10 |
| `maxSessionCompression` | 会话压缩最大保留消息数 | 5 |

---

## 7. DB Service 实现

```typescript
// modules/db/db.service.ts

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DbService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const txcodeDir = path.join(home, '.txcode');
    
    if (!fs.existsSync(txcodeDir)) {
      fs.mkdirSync(txcodeDir, { recursive: true });
    }

    this.dbPath = dbPath || path.join(txcodeDir, 'data.db');
  }

  init(): void {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.runMigrations();
  }

  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrations = [this.migration001];

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      const applied = this.db.prepare(
        'SELECT 1 FROM migrations WHERE id = ?'
      ).get(i + 1);

      if (!applied) {
        migration();
        this.db.prepare(
          'INSERT INTO migrations (id, name) VALUES (?, ?)'
        ).run(i + 1, migration.name);
      }
    }
  }

  private migration001(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        is_permanent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_path TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_path, key)
      );

      CREATE TABLE IF NOT EXISTS code_snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        lang TEXT NOT NULL,
        description TEXT,
        code TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        base_url TEXT DEFAULT 'https://api.openai.com/v1',
        enabled INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_permanent ON messages(session_id, is_permanent);
      CREATE INDEX IF NOT EXISTS idx_project_knowledge_path ON project_knowledge(project_path);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_session ON code_snippets(session_id);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_lang ON code_snippets(lang);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
    `);

    // 初始化默认配置
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxToolIterations', '10')`);
    this.db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('ai.maxSessionCompression', '5')`);
  }

  getDb(): Database.Database {
    if (!this.db) this.init();
    return this.db!;
  }

  run(sql: string, params?: any): Database.RunResult {
    return this.getDb().prepare(sql).run(params);
  }

  get<T>(sql: string, params?: any): T | undefined {
    return this.getDb().prepare(sql).get(params) as T | undefined;
  }

  all<T>(sql: string, params?: any): T[] {
    return this.getDb().prepare(sql).all(params) as T[];
  }

  transaction<T>(fn: () => T): T {
    return this.getDb().transaction(fn)();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const dbService = new DbService();
```

---

## 8. Memory Repository

```typescript
// modules/memory/memory.repository.ts

import { dbService } from '../db/db.service';

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  is_permanent: number;  // 0: 临时 1: 永久
  created_at: string;
}

export interface Knowledge {
  id: number;
  project_path: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export class MemoryRepository {
  addMessage(
    sessionId: string, 
    role: string, 
    content: string, 
    isPermanent: boolean = false
  ): number {
    const result = dbService.run(
      'INSERT INTO messages (session_id, role, content, is_permanent) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, isPermanent ? 1 : 0]
    );
    return result.lastInsertRowid as number;
  }

  // 获取永久记忆（用于下一轮对话）
  getPermanentMessages(sessionId: string): Message[] {
    return dbService.all<Message>(
      `SELECT * FROM messages 
       WHERE session_id = ? AND is_permanent = 1 
       ORDER BY created_at ASC`,
      [sessionId]
    );
  }

  // 获取所有消息
  getAllMessages(sessionId: string): Message[] {
    return dbService.all<Message>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
  }

  // 获取临时记忆（当前轮次）
  getTemporaryMessages(sessionId: string): Message[] {
    return dbService.all<Message>(
      `SELECT * FROM messages 
       WHERE session_id = ? AND is_permanent = 0 
       ORDER BY created_at DESC
       LIMIT 10`,
      [sessionId]
    );
  }

  // 删除临时记忆
  clearTemporaryMessages(sessionId: string): void {
    dbService.run(
      'DELETE FROM messages WHERE session_id = ? AND is_permanent = 0',
      [sessionId]
    );
  }

  // 将临时记忆转为永久
  markAsPermanent(messageId: number): void {
    dbService.run(
      'UPDATE messages SET is_permanent = 1 WHERE id = ?',
      [messageId]
    );
  }

  // 会话压缩：保留最近的永久消息
  compressSession(sessionId: string, keepCount: number): void {
    const messages = dbService.all<Message>(
      `SELECT id FROM messages 
       WHERE session_id = ? AND is_permanent = 1 
       ORDER BY created_at DESC`,
      [sessionId]
    );

    if (messages.length > keepCount) {
      const toDelete = messages.slice(keepCount).map(m => m.id);
      dbService.run(
        `DELETE FROM messages WHERE id IN (${toDelete.join(',')})`,
      );
    }
  }

  // 知识库
  searchKnowledge(projectPath: string, query: string, limit = 10): Knowledge[] {
    return dbService.all<Knowledge>(
      `SELECT * FROM project_knowledge 
       WHERE project_path = ? AND (key LIKE ? OR value LIKE ?) 
       LIMIT ?`,
      [projectPath, `%${query}%`, `%${query}%`, limit]
    );
  }

  saveKnowledge(projectPath: string, key: string, value: string): void {
    dbService.run(
      `INSERT INTO project_knowledge (project_path, key, value) 
       VALUES (?, ?, ?) 
       ON CONFLICT(project_path, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [projectPath, key, value]
    );
  }
}

export const memoryRepository = new MemoryRepository();
```

---

## 9. 会话压缩流程

```
┌─────────────────────────────────────────────────────────────┐
│                    会话压缩流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 获取配置 maxSessionCompression = 5                      │
│                                                              │
│  2. 获取永久消息数                                           │
│     SELECT COUNT(*) FROM messages                           │
│     WHERE session_id = ? AND is_permanent = 1              │
│                                                              │
│  3. 如果 > maxSessionCompression                             │
│     - 保留最近 5 条永久消息                                  │
│     - 删除更早的永久消息                                     │
│                                                              │
│  4. 结果                                                    │
│     保留: [msg1, msg2, msg3, msg4, msg5]                    │
│     删除: [msg0]                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 数据库流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                     其他模块 (Service)                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ memory  │  │   ai    │  │ session │  │ config  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository 层                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ memory.repository  │ session.repository │ config.repo   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DbService (modules/db)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  getDb()  │  run()  │  get()  │  all()  │  transaction() │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │
│  │ sessions│  │ messages│  │knowledge│  │models   │  │providers│ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └───────┘ │
│                                                                 │
│  messages.is_permanent: 0=临时记忆 1=永久记忆                  │
└─────────────────────────────────────────────────────────────────┘
```
