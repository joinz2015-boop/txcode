# Session 模块设计

## 1. Session 概述

Session 模块负责管理用户的对话会话，包括创建、切换、列表、删除等操作。

---

## 2. 功能列表

| 功能 | 说明 |
|------|------|
| 创建会话 | 创建新会话 |
| 获取会话 | 获取会话详情 |
| 列出会话 | 分页列出所有会话 |
| 切换会话 | 切换当前会话 |
| 删除会话 | 删除会话及其消息 |
| 搜索会话 | 搜索会话标题/内容 |
| 更新会话 | 更新会话标题 |

---

## 3. Session 类型定义

```typescript
// modules/session/session.types.ts

export interface Session {
  id: string;
  title: string;
  projectPath?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface SessionDetail extends Session {
  messages: Message[];
}

export interface Message {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  isPermanent: boolean;
  createdAt: string;
}
```

---

## 4. Session Repository

```typescript
// modules/session/session.repository.ts

import { dbService } from '../db/db.service';
import { Session, Message } from './session.types';

export class SessionRepository {
  create(id: string, title: string, projectPath?: string): Session {
    dbService.run(
      'INSERT INTO sessions (id, title, project_path) VALUES (?, ?, ?)',
      [id, title, projectPath || null]
    );
    
    return this.get(id)!;
  }

  get(id: string): Session | undefined {
    const row = dbService.get<any>(
      'SELECT * FROM sessions WHERE id = ?',
      [id]
    );
    
    if (!row) return undefined;

    const messageCount = dbService.get<any>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
      [id]
    )?.count || 0;

    const lastMessage = dbService.get<any>(
      'SELECT content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    )?.content;

    return {
      id: row.id,
      title: row.title,
      projectPath: row.project_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount,
      lastMessage,
    };
  }

  list(limit = 20, offset = 0): Session[] {
    const rows = dbService.all<any>(
      'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return rows.map(row => {
      const messageCount = dbService.get<any>(
        'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
        [row.id]
      )?.count || 0;

      const lastMessage = dbService.get<any>(
        'SELECT content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
        [row.id]
      )?.content;

      return {
        id: row.id,
        title: row.title,
        projectPath: row.project_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount,
        lastMessage,
      };
    });
  }

  update(id: string, data: { title?: string }): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      dbService.run(
        `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  delete(id: string): void {
    dbService.run('DELETE FROM sessions WHERE id = ?', [id]);
  }

  search(query: string, limit = 10): Session[] {
    const rows = dbService.all<any>(
      `SELECT DISTINCT s.* FROM sessions s
       LEFT JOIN messages m ON s.id = m.session_id
       WHERE s.title LIKE ? OR m.content LIKE ?
       ORDER BY s.updated_at DESC
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit]
    );

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      projectPath: row.project_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: 0,
    }));
  }

  updateTimestamp(id: string): void {
    dbService.run(
      'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  getMessages(sessionId: string, limit?: number, offset?: number): Message[] {
    const sql = limit !== undefined
      ? 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?'
      : 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC';
    
    const params = limit !== undefined
      ? [sessionId, limit, offset]
      : [sessionId];

    return dbService.all<Message>(sql, params);
  }
}

export const sessionRepository = new SessionRepository();
```

---

## 5. Session Service

```typescript
// modules/session/session.service.ts

import { v4 as uuid } from 'uuid';
import { sessionRepository } from './session.repository';
import { memoryRepository } from '../memory/memory.repository';
import { Session, SessionDetail, Message } from './session.types';

export class SessionService {
  private currentSessionId?: string;

  create(title?: string, projectPath?: string): Session {
    const id = uuid();
    const sessionTitle = title || `新会话 ${new Date().toLocaleString('zh-CN')}`;
    
    const session = sessionRepository.create(id, sessionTitle, projectPath);
    this.currentSessionId = id;
    
    return session;
  }

  get(id: string): Session | undefined {
    return sessionRepository.get(id);
  }

  getCurrentSession(): Session | undefined {
    if (!this.currentSessionId) return undefined;
    return this.get(this.currentSessionId);
  }

  setCurrentSession(id: string): Session | undefined {
    const session = this.get(id);
    if (session) {
      this.currentSessionId = id;
    }
    return session;
  }

  list(limit = 20, offset = 0): Session[] {
    return sessionRepository.list(limit, offset);
  }

  update(id: string, data: { title?: string }): Session | undefined {
    sessionRepository.update(id, data);
    return this.get(id);
  }

  delete(id: string): void {
    sessionRepository.delete(id);
    if (this.currentSessionId === id) {
      this.currentSessionId = undefined;
    }
  }

  search(query: string): Session[] {
    return sessionRepository.search(query);
  }

  getMessages(sessionId: string, limit?: number, offset?: number): Message[] {
    return memoryRepository.getAllMessages(sessionId);
  }

  getDetail(id: string): SessionDetail | undefined {
    const session = this.get(id);
    if (!session) return undefined;

    const messages = this.getMessages(id);

    return {
      ...session,
      messages,
    };
  }

  updateTimestamp(id: string): void {
    sessionRepository.updateTimestamp(id);
  }

  getCurrentSessionId(): string | undefined {
    return this.currentSessionId;
  }
}

export const sessionService = new SessionService();
```

---

## 6. 会话流程图

```
┌─────────────────────────────────────────────────────────────┐
│                      会话管理流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  创建会话                                                    │
│  sessionService.create()                                    │
│       │                                                      │
│       ├── sessionRepository.create()                        │
│       ├── 设置为当前会话                                    │
│       └── 返回 Session                                       │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  切换会话                                                    │
│  sessionService.setCurrentSession(id)                       │
│       │                                                      │
│       └── 更新 currentSessionId                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  删除会话                                                    │
│  sessionService.delete(id)                                  │
│       │                                                      │
│       ├── sessionRepository.delete() → 同步删除 messages   │
│       └── 如果是当前会话，清除 currentSessionId            │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  会话压缩                                                    │
│  memoryRepository.compressSession()                         │
│       │                                                      │
│       ├── 获取永久消息数                                    │
│       └── 保留最近 maxSessionCompression 条                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. CLI 命令对应

```bash
txcode                      # 无会话 → 创建新会话
txcode --new                # 创建新会话
txcode --list               # 列出会话
txcode --load <id>          # 加载指定会话
txcode --delete <id>        # 删除会话
txcode "消息"              # 使用当前/新会话发送消息
```

---

## 8. API 对应

```typescript
// api/session.api.ts

export const sessionApi = {
  // 创建会话
  async create(title?: string, projectPath?: string) {
    return sessionService.create(title, projectPath);
  },

  // 获取当前会话
  async getCurrent() {
    return sessionService.getCurrentSession();
  },

  // 设置当前会话
  async setCurrent(id: string) {
    return sessionService.setCurrentSession(id);
  },

  // 获取会话详情
  async getDetail(id: string) {
    return sessionService.getDetail(id);
  },

  // 列出会话
  async list(limit?: number, offset?: number) {
    return sessionService.list(limit, offset);
  },

  // 更新会话
  async update(id: string, data: { title?: string }) {
    return sessionService.update(id, data);
  },

  // 删除会话
  async delete(id: string) {
    sessionService.delete(id);
  },

  // 搜索会话
  async search(query: string) {
    return sessionService.search(query);
  },
};
```

---

## 9. Web API 路由

```typescript
// GET /api/sessions
// POST /api/sessions
// GET /api/sessions/:id
// PUT /api/sessions/:id
// DELETE /api/sessions/:id
// GET /api/sessions/:id/messages
// POST /api/sessions/current  // 设置当前会话
```
