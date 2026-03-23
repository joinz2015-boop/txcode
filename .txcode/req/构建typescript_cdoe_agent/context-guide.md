# Context 模块设计

## 1. Context 概述

Context 模块负责获取和解析项目上下文信息，包括项目结构、依赖、配置等。

---

## 2. 功能列表

| 功能 | 说明 |
|------|------|
| 项目路径 | 获取当前项目根目录 |
| 项目结构 | 递归列出项目文件和目录 |
| Git 信息 | 获取 git 分支、状态、远程仓库 |
| 依赖信息 | 读取 package.json、requirements.txt 等 |
| 配置文件 | 读取项目配置文件 |
| 技术栈判断 | 根据文件判断前端/后端技术栈 |

---

## 3. 会话上下文管理（Session Context）

### 3.1 背景

在多轮对话中，需要管理会话历史消息，平衡：
- **上下文完整性**：让 AI 了解之前的对话历史
- **Token 成本**：控制请求的 token 数量，避免超出模型限制
- **响应质量**：保留关键信息，避免无关信息干扰

### 3.2 问题

当前问题：
- 固定保留 N 条消息
- 丢失完整对话上下文
- 没有区分"完整对话"和"关键结论"

### 3.3 参考：OpenCode 的做法

OpenCode 采用**动态触发 + AI 压缩**的策略：

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenCode 压缩策略                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 触发条件                                                     │
│     tokens >= model.contextWindow * 0.95                        │
│     （当 token 数达到模型上下文窗口的 95% 时触发）                  │
│                                                                 │
│  2. 压缩方式                                                     │
│     - 调用 AI 生成详细摘要                                        │
│     - 摘要包含：做了什么、正在做什么、接下来做什么                   │
│     - 摘要作为 User 消息                                          │
│     - 清空摘要之前的所有消息                                       │
│                                                                 │
│  3. 数据结构                                                     │
│     Session 表有 summaryMessageId 字段                            │
│     指向摘要消息，下次对话从摘要开始加载                            │
│                                                                 │
│  4. 支持手动触发                                                 │
│     用户可以通过 /compact 命令手动触发压缩                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 核心设计

#### 3.4.1 单表设计

OpenCode 采用**单表 + 摘要指针**的设计，比双表更简单：

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据存储设计                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  messages 表（唯一消息表）                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ id                    │ 自增 ID                        │    │
│  │ session_id            │ 会话 ID                         │    │
│  │ role                  │ user/assistant/system/tool      │    │
│  │ content               │ 消息内容                        │    │
│  │ keep_context          │ 是否永久保留（0=临时,1=永久）   │    │
│  │ parts                 │ 多部分内容（工具调用等）         │    │
│  │ model                 │ 使用的模型                       │    │
│  │ finish_reason         │ 结束原因                        │    │
│  │ created_at            │ 创建时间                        │    │
│  │ updated_at            │ 更新时间                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  sessions 表                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ id                    │ 会话 ID                         │    │
│  │ title                 │ 会话标题                        │    │
│  │ summary_message_id    │ 摘要消息 ID（压缩后指向）         │    │
│  │ prompt_tokens         │ 输入 token 数                    │    │
│  │ completion_tokens    │ 输出 token 数                    │    │
│  │ cost                  │ 费用                            │    │
│  │ created_at            │ 创建时间                        │    │
│  │ updated_at            │ 更新时间                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  加载逻辑：                                                      │
│  if (session.summaryMessageId) {                                │
│    // 从摘要消息开始加载，只加载永久消息                           │
│    messages = getMessagesFrom(summaryMessageId, keepContext=true)│
│    messages[0].role = 'user'  // 摘要作为 user 消息              │
│  } else {                                                       │
│    // 加载全部永久消息                                           │
│    messages = getAllMessages(sessionId, keepContext=true)        │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 keepContext 语义

消息表中的 `keep_context` 字段用于区分永久消息和临时消息：

| 值 | 语义 | 使用场景 |
|----|------|---------|
| `1` (true) | 永久消息，加载时保留 | 重要结论、关键决策、用户问题、最终答案 |
| `0` (false) | 临时消息，加载时排除 | 测试输出、调试日志、探索性查看、工具中间结果 |

**AI 判断规则（在 ReAct 输出中声明）**：

```
需要保留（keep_context: true）：
- 这个结果会影响后续的决策
- 用户可能后续会问关于这个结果的问题
- 这是完成任务的必要中间信息
- 包含文件路径、代码修改等关键信息

不需要保留（keep_context: false）：
- 只是探索性查看，后续不会再用到
- 纯调试性输出、测试日志
- 已经完成的任务，后续不需要再提及
- 重复的或冗余的信息
```

**加载时的过滤逻辑**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    消息加载策略                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  加载消息时只获取 keep_context = 1 的消息：                      │
│                                                                 │
│  SELECT * FROM messages                                         │
│  WHERE session_id = ?                                           │
│    AND keep_context = 1                                         │
│    AND id >= ?  -- 如果有 summaryMessageId                       │
│  ORDER BY created_at ASC                                         │
│                                                                 │
│  这样可以：                                                      │
│  - 节省 token：排除测试、调试日志                                │
│  - 保留关键信息：重要决策、文件路径等                             │
│  - 提高响应质量：减少噪音干扰                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.4.3 压缩流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI 压缩流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 每次对话完成后检查                                           │
│     tokens = session.promptTokens + session.completionTokens    │
│     threshold = getThreshold() // 根据配置计算阈值              │
│                                                                 │
│  2. 判断是否需要压缩                                             │
│     if (tokens >= threshold && autoCompact) {                   │
│       triggerCompaction()                                       │
│     }                                                           │
│                                                                 │
│  3. 执行压缩                                                     │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ const allMessages = getAllMessages(sessionId)        │    │
│     │ const prompt = `Provide a detailed but concise      │    │
│     │   summary of our conversation above. Focus on:      │    │
│     │   - What we did                                     │    │
│     │   - What we're doing                                │    │
│     │   - Which files we're working on                    │    │
│     │   - What we're going to do next`                    │    │
│     │                                                     │    │
│     │ const summary = await summarizeAI.generate(         │    │
│     │   [...allMessages, { role: 'user', content: prompt }]│    │
│     │ )                                                   │    │
│     │                                                     │    │
│     │ const summaryMsg = await createMessage(sessionId, { │    │
│     │   role: 'assistant',                                │    │
│     │   content: summary                                  │    │
│     │ })                                                  │    │
│     │                                                     │    │
│     │ session.summaryMessageId = summaryMsg.id            │    │
│     │ session.promptTokens = 0  // 重置 token 计数         │    │
│     │ session.completionTokens = 0                        │    │
│     │ await saveSession(session)                          │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  4. 下次对话加载                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ if (session.summaryMessageId) {                     │    │
│     │   messages = getMessagesFrom(summaryMessageId)      │    │
│     │   messages[0].role = 'user' // 摘要改为 user 角色     │    │
│     │ } else {                                            │    │
│     │   messages = getAllMessages(sessionId)              │    │
│     │ }                                                   │    │
│     │                                                     │    │
│     │ // 添加当前用户消息                                  │    │
│     │ messages.push(currentUserMessage)                   │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 配置设计

### 4.1 配置文件结构

```typescript
// src/config/tx.config.ts

export interface TxConfig {
  debug: boolean;
  
  log: {
    enabled: boolean;
    dir: string;
    accessLog: string;
  };
  
  maxToolIterations: number;
  
  ai: {
    // 上下文压缩配置
    context: {
      // 模式：'fixed' | 'percentage'
      // - 'fixed': 使用固定的 token 阈值
      // - 'percentage': 根据模型上下文窗口的百分比计算
      mode: 'fixed' | 'percentage';
      
      // 固定模式下的 token 阈值（默认 10000）
      maxTokens: number;
      
      // 百分比模式下的比例（默认 0.95，即 95%）
      percentage: number;
      
      // 是否启用自动压缩（默认 true）
      autoCompact: boolean;
    };
  };
}

const defaultConfig: TxConfig = {
  debug: true,
  
  log: {
    enabled: true,
    dir: 'log',
    accessLog: 'access.log',
  },
  
  maxToolIterations: 50,
  
  ai: {
    context: {
      mode: 'fixed',           // 默认使用固定模式
      maxTokens: 10000,        // 默认 10k token
      percentage: 0.95,        // 百分比模式下使用 95%
      autoCompact: true,       // 默认启用自动压缩
    },
  },
};

export default defaultConfig;
```

### 4.2 阈值计算逻辑

```typescript
// src/modules/session/context-threshold.ts

import { TxConfig } from '../../config/tx.config.js';

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;  // 模型上下文窗口大小
}

/**
 * 计算上下文压缩阈值
 */
export function calculateThreshold(
  config: TxConfig,
  model?: ModelInfo
): number {
  const { mode, maxTokens, percentage } = config.ai.context;
  
  if (mode === 'fixed') {
    // 固定模式：直接返回配置的 token 数
    return maxTokens;
  }
  
  if (mode === 'percentage' && model) {
    // 百分比模式：根据模型上下文窗口计算
    return Math.floor(model.contextWindow * percentage);
  }
  
  // 降级：百分比模式但没有模型信息，使用默认值
  return maxTokens;
}

/**
 * 检查是否需要压缩
 */
export function shouldCompact(
  promptTokens: number,
  completionTokens: number,
  threshold: number,
  autoCompact: boolean
): boolean {
  if (!autoCompact) return false;
  
  const totalTokens = promptTokens + completionTokens;
  return totalTokens >= threshold;
}
```

---

## 5. 数据库设计

### 5.1 表结构变更

```sql
-- sessions 表新增字段
ALTER TABLE sessions ADD COLUMN summary_message_id TEXT;
ALTER TABLE sessions ADD COLUMN prompt_tokens INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN completion_tokens INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN cost REAL DEFAULT 0;

-- messages 表新增字段（如果不存在）
ALTER TABLE messages ADD COLUMN keep_context INTEGER DEFAULT 1;

-- models 表新增字段
ALTER TABLE models ADD COLUMN context_window INTEGER DEFAULT 4096;
ALTER TABLE models ADD COLUMN max_output_tokens INTEGER DEFAULT 4096;
ALTER TABLE models ADD COLUMN supports_vision INTEGER DEFAULT 0;
ALTER TABLE models ADD COLUMN supports_tools INTEGER DEFAULT 1;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sessions_summary ON sessions(summary_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_keep_context ON messages(session_id, keep_context);
```

### 5.2 迁移脚本

```typescript
// src/modules/db/migrations/002_add_context_fields.ts

export function migration002(): void {
  // sessions 表新增字段
  db.exec(`ALTER TABLE sessions ADD COLUMN summary_message_id TEXT`);
  db.exec(`ALTER TABLE sessions ADD COLUMN prompt_tokens INTEGER DEFAULT 0`);
  db.exec(`ALTER TABLE sessions ADD COLUMN completion_tokens INTEGER DEFAULT 0`);
  db.exec(`ALTER TABLE sessions ADD COLUMN cost REAL DEFAULT 0`);
  
  // messages 表新增 keep_context 字段（如果不存在）
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN keep_context INTEGER DEFAULT 1`);
  } catch {
    // 字段已存在，忽略错误
  }
  
  // models 表新增字段
  db.exec(`ALTER TABLE models ADD COLUMN context_window INTEGER DEFAULT 4096`);
  db.exec(`ALTER TABLE models ADD COLUMN max_output_tokens INTEGER DEFAULT 4096`);
  db.exec(`ALTER TABLE models ADD COLUMN supports_vision INTEGER DEFAULT 0`);
  db.exec(`ALTER TABLE models ADD COLUMN supports_tools INTEGER DEFAULT 1`);
  
  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_summary ON sessions(summary_message_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_keep_context ON messages(session_id, keep_context)`);
  
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
    db.exec(
      `UPDATE models SET context_window = ? WHERE id = ?`,
      [contextWindow, modelId]
    );
  }
}
```

---

## 6. 类型定义

### 6.1 Session 类型更新

```typescript
// src/modules/session/session.types.ts

export interface Session {
  id: string;
  title: string;
  projectPath: string | null;
  
  // Token 统计
  promptTokens: number;
  completionTokens: number;
  cost: number;
  
  // 压缩相关
  summaryMessageId: string | null;  // 指向摘要消息
  
  createdAt: string;
  updatedAt: string;
}

export interface SessionState {
  currentSessionId: string | null;
  sessions: Session[];
}

export interface CompactionResult {
  success: boolean;
  summaryMessageId?: string;
  tokensBefore: number;
  tokensAfter: number;
  error?: string;
}

// Message 类型
export interface Message {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  keepContext: boolean;  // 是否永久保留
  createdAt: string;
}
```

### 6.2 Model 类型更新

```typescript
// src/modules/model/model.types.ts

export interface Model {
  id: string;
  providerId: string;
  name: string;
  enabled: boolean;
  
  // 能力相关
  contextWindow: number;      // 上下文窗口大小
  maxOutputTokens: number;    // 最大输出 token
  supportsVision: boolean;    // 是否支持视觉
  supportsTools: boolean;     // 是否支持工具调用
  
  createdAt: string;
  updatedAt: string;
}

// 预定义模型列表
export const PREDEFINED_MODELS: Model[] = [
  {
    id: 'gpt-4o',
    providerId: 'openai',
    name: 'GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsTools: true,
    enabled: true,
  },
  {
    id: 'claude-3.5-sonnet',
    providerId: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    enabled: true,
  },
  // ... 其他模型
];
```

---

## 7. 服务实现

### 7.1 ReAct Agent 中 keepContext 的处理

在 ReAct 执行过程中，AI 会在输出中声明 `keep_context` 值：

```typescript
// src/modules/ai/react.agent.ts

// ReAct 输出示例：
// Thought: 用户想查看项目依赖
// Action: read_file
// Action Input: {"path": "package.json"}
// Observation: {...}
// Keep Context: true  // AI 声明是否需要保留
// Final Answer: 项目使用 TypeScript...

while (iteration < this.maxIterations) {
  const response = await this.provider.chat(messages);
  const parsed = reactParser.parse(aiContent);
  
  // 解析 keepContext 值
  const keepContext = parsed.keepContext ?? true;  // 默认保留
  
  // 根据消息类型和 keepContext 决定是否保存
  if (latestStep.final_answer) {
    // Final Answer 默认保留
    this.addMessage('assistant', finalAnswer, true);
  } else if (latestStep.action) {
    // 工具调用根据 AI 声明决定
    this.addMessage('assistant', aiContent, keepContext);
    this.addMessage('user', toolResultMessage, keepContext);
  }
}

// 消息保存方法
private addMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  keepContext: boolean
): void {
  if (!this.sessionId || !this.memoryService) return;
  
  this.memoryService.addMessage(
    this.sessionId,
    role,
    content,
    keepContext
  );
}
```

### 7.2 Session 服务更新

```typescript
// src/modules/session/session.service.ts

import { v4 as uuidv4 } from 'uuid';
import { DbService } from '../db/db.service.js';
import { Session, CompactionResult } from './session.types.js';
import { calculateThreshold, shouldCompact } from './context-threshold.js';
import { config } from '../../config/tx.config.js';
import { Model } from '../model/model.types.js';

export class SessionService {
  private db: DbService;
  
  /**
   * 获取用于 AI 的消息列表（只加载永久消息）
   */
  getMessagesForAI(sessionId: string): Message[] {
    const session = this.get(sessionId);
    if (!session) return [];
    
    let messages: Message[];
    
    if (session.summaryMessageId) {
      // 从摘要消息开始加载，只加载永久消息
      messages = this.getMessagesFrom(session.summaryMessageId, true);
      // 摘要消息改为 user 角色
      if (messages.length > 0) {
        messages[0].role = 'user';
      }
    } else {
      // 加载全部永久消息
      messages = this.getAllMessages(sessionId, true);
    }
    
    return messages;
  }
  
  /**
   * 获取所有消息
   * @param sessionId - 会话 ID
   * @param keepContextOnly - 是否只获取永久消息
   */
  getAllMessages(sessionId: string, keepContextOnly: boolean = false): Message[] {
    let sql = 'SELECT * FROM messages WHERE session_id = ?';
    const params: any[] = [sessionId];
    
    if (keepContextOnly) {
      sql += ' AND keep_context = 1';
    }
    
    sql += ' ORDER BY created_at ASC';
    
    return this.db.all<Message>(sql, params);
  }
  
  /**
   * 从指定消息 ID 开始获取消息
   * @param fromId - 起始消息 ID
   * @param keepContextOnly - 是否只获取永久消息
   */
  getMessagesFrom(fromId: string, keepContextOnly: boolean = false): Message[] {
    const message = this.db.get<Message>(
      'SELECT * FROM messages WHERE id = ?',
      [fromId]
    );
    
    if (!message) return [];
    
    let sql = 'SELECT * FROM messages WHERE session_id = ? AND created_at >= ?';
    const params: any[] = [message.session_id, message.created_at];
    
    if (keepContextOnly) {
      sql += ' AND keep_context = 1';
    }
    
    sql += ' ORDER BY created_at ASC';
    
    return this.db.all<Message>(sql, params);
  }
  
  /**
   * 更新 token 统计
   */
  updateTokenUsage(
    sessionId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number
  ): void {
    this.db.run(
      `UPDATE sessions 
       SET prompt_tokens = prompt_tokens + ?,
           completion_tokens = completion_tokens + ?,
           cost = cost + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [promptTokens, completionTokens, cost, sessionId]
    );
  }
  
  /**
   * 检查是否需要压缩
   */
  checkCompactionNeeded(sessionId: string, model: Model): boolean {
    const session = this.get(sessionId);
    if (!session) return false;
    
    const threshold = calculateThreshold(config, model);
    
    return shouldCompact(
      session.promptTokens,
      session.completionTokens,
      threshold,
      config.ai.context.autoCompact
    );
  }
  
  /**
   * 执行上下文压缩
   */
  async compact(
    sessionId: string,
    summarizeAI: SummarizeService
  ): Promise<CompactionResult> {
    const session = this.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const messages = this.getAllMessages(sessionId);
    if (messages.length === 0) {
      return { success: false, error: 'No messages to compact' };
    }
    
    const tokensBefore = session.promptTokens + session.completionTokens;
    
    try {
      // 生成摘要
      const summary = await summarizeAI.summarize(messages);
      
      // 创建摘要消息
      const summaryMessage = this.createMessage(sessionId, {
        role: 'assistant',
        content: summary,
      });
      
      // 更新 session
      this.db.run(
        `UPDATE sessions 
         SET summary_message_id = ?,
             prompt_tokens = 0,
             completion_tokens = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [summaryMessage.id, sessionId]
      );
      
      return {
        success: true,
        summaryMessageId: summaryMessage.id,
        tokensBefore,
        tokensAfter: 0, // 压缩后重置
      };
    } catch (error) {
      return {
        success: false,
        tokensBefore,
        tokensAfter: tokensBefore,
        error: error.message,
      };
    }
  }
}
```

### 7.3 MemoryService 更新

```typescript
// src/modules/memory/memory.service.ts

export class MemoryService {
  /**
   * 添加消息
   * @param sessionId - 会话 ID
   * @param role - 角色
   * @param content - 内容
   * @param keepContext - 是否永久保留（默认 true）
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean = true
  ): Message {
    const result = this.db.run(
      `INSERT INTO messages (session_id, role, content, keep_context)
       VALUES (?, ?, ?, ?)`,
      [sessionId, role, content, keepContext ? 1 : 0]
    );
    
    return this.getMessage(result.lastInsertRowid);
  }
  
  /**
   * 获取所有消息
   * @param sessionId - 会话 ID
   * @param keepContextOnly - 是否只获取永久消息（默认 false，用于摘要生成）
   */
  getAllMessages(sessionId: string, keepContextOnly: boolean = false): Message[] {
    let sql = 'SELECT * FROM messages WHERE session_id = ?';
    const params: any[] = [sessionId];
    
    if (keepContextOnly) {
      sql += ' AND keep_context = 1';
    }
    
    sql += ' ORDER BY created_at ASC';
    
    return this.db.all<Message>(sql, params);
  }
  
  /**
   * 获取永久消息（用于 AI 对话）
   */
  getPermanentMessages(sessionId: string): Message[] {
    return this.getAllMessages(sessionId, true);
  }
}
```

### 7.4 摘要服务

摘要服务放在 `src/modules/ai/summarizer/` 目录下，使用与 ReAct 相同的模型。

```typescript
// src/modules/ai/summarizer/summarizer.prompts.ts

/**
 * 摘要生成的提示词
 */
export const SUMMARIZER_PROMPT = `Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including:

- What we did (completed tasks, decisions made)
- What we're currently working on (active tasks, pending work)
- Which files we're working on (file paths, modifications made)
- What we're going to do next (planned actions, next steps)

Keep the summary comprehensive but avoid unnecessary details. The goal is to provide enough context for continuing the conversation efficiently.`;

/**
 * 构建摘要请求消息
 */
export function buildSummarizerMessages(messages: ChatMessage[]): ChatMessage[] {
  return [
    ...messages,
    {
      role: 'user',
      content: SUMMARIZER_PROMPT,
    },
  ];
}
```

```typescript
// src/modules/ai/summarizer/summarizer.types.ts

export interface SummarizerResult {
  success: boolean;
  summary: string;
  tokensBefore: number;
  tokensAfter: number;
  error?: string;
}

export interface SummarizerOptions {
  sessionId: string;
  onProgress?: (message: string) => void;
}
```

```typescript
// src/modules/ai/summarizer/summarizer.service.ts

import { ConfigService, configService } from '../../config/config.service.js';
import { OpenAIProvider } from '../openai.provider.js';
import { buildSummarizerMessages } from './summarizer.prompts.js';
import { SummarizerResult, SummarizerOptions } from './summarizer.types.js';
import { ChatMessage } from '../ai.types.js';
import { SessionService } from '../../session/session.service.js';
import { MemoryService } from '../../memory/memory.service.js';

export class SummarizerService {
  private configService: ConfigService;
  private sessionService: SessionService;
  private memoryService: MemoryService;
  
  constructor(
    sessionService: SessionService,
    memoryService: MemoryService,
    configSvc?: ConfigService
  ) {
    this.sessionService = sessionService;
    this.memoryService = memoryService;
    this.configService = configSvc || configService;
  }
  
  /**
   * 获取 Provider（使用与 ReAct 相同的模型配置）
   */
  private getProvider(): OpenAIProvider {
    const providerConfig = this.configService.getDefaultProvider();
    if (!providerConfig) {
      throw new Error('No default AI provider configured');
    }
    
    const models = this.configService.getModels(providerConfig.id);
    const defaultModel = models.find(m => m.enabled) || { name: 'gpt-4' };
    
    return new OpenAIProvider({
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      defaultModel: defaultModel.name,
    });
  }
  
  /**
   * 执行上下文压缩
   */
  async compact(options: SummarizerOptions): Promise<SummarizerResult> {
    const { sessionId, onProgress } = options;
    
    // 获取 session
    const session = this.sessionService.get(sessionId);
    if (!session) {
      return {
        success: false,
        summary: '',
        tokensBefore: 0,
        tokensAfter: 0,
        error: 'Session not found',
      };
    }
    
    // 获取所有消息（包括临时消息，因为生成摘要需要完整历史）
    const messages = this.memoryService.getAllMessages(sessionId, false);
    if (messages.length === 0) {
      return {
        success: false,
        summary: '',
        tokensBefore: 0,
        tokensAfter: 0,
        error: 'No messages to compact',
      };
    }
    
    const tokensBefore = session.promptTokens + session.completionTokens;
    
    onProgress?.('正在生成摘要...');
    
    try {
      // 构建 ChatMessage 格式
      const chatMessages: ChatMessage[] = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));
      
      // 添加摘要请求
      const summarizerMessages = buildSummarizerMessages(chatMessages);
      
      // 调用 AI（使用与 ReAct 相同的模型）
      const provider = this.getProvider();
      const response = await provider.chat(summarizerMessages);
      
      const summary = response.content?.trim() || '';
      
      if (!summary) {
        return {
          success: false,
          summary: '',
          tokensBefore,
          tokensAfter: tokensBefore,
          error: 'Empty summary returned',
        };
      }
      
      onProgress?.('正在保存摘要...');
      
      // 创建摘要消息（永久保留）
      const summaryMessage = this.memoryService.addMessage(
        sessionId,
        'assistant',
        summary,
        true  // keepContext = true
      );
      
      // 更新 session
      this.sessionService.updateSummary(sessionId, summaryMessage.id);
      this.sessionService.resetTokens(sessionId);
      
      return {
        success: true,
        summary,
        tokensBefore,
        tokensAfter: 0, // 压缩后重置
      };
    } catch (error) {
      return {
        success: false,
        summary: '',
        tokensBefore,
        tokensAfter: tokensBefore,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * 检查是否需要压缩
   */
  checkNeedsCompact(sessionId: string): { needed: boolean; reason: string } {
    const session = this.sessionService.get(sessionId);
    if (!session) {
      return { needed: false, reason: 'Session not found' };
    }
    
    const config = this.configService.getContextConfig();
    const model = this.configService.getCurrentModel();
    
    // 计算阈值
    let threshold: number;
    if (config.mode === 'percentage' && model?.contextWindow) {
      threshold = Math.floor(model.contextWindow * config.percentage);
    } else {
      threshold = config.maxTokens;
    }
    
    const totalTokens = session.promptTokens + session.completionTokens;
    
    if (!config.autoCompact) {
      return { needed: false, reason: 'Auto compact disabled' };
    }
    
    if (totalTokens < threshold) {
      return { 
        needed: false, 
        reason: `Tokens (${totalTokens}) below threshold (${threshold})` 
      };
    }
    
    return { needed: true, reason: `Tokens (${totalTokens}) exceeded threshold (${threshold})` };
  }
}
```

---

## 8. 文件结构

```
src/
├── config/
│   └── tx.config.ts              # 全局配置（不含 prompt）
│
├── modules/
│   ├── ai/
│   │   ├── react.agent.ts        # ReAct Agent
│   │   ├── openai.provider.ts    # OpenAI Provider
│   │   ├── ai.service.ts         # AI 服务入口
│   │   │
│   │   ├── react/
│   │   │   ├── react.prompts.ts  # ReAct 提示词
│   │   │   ├── react.parser.ts   # ReAct 解析器
│   │   │   └── react.types.ts    # ReAct 类型
│   │   │
│   │   └── summarizer/           # 摘要压缩模块
│   │       ├── summarizer.prompts.ts   # 摘要提示词
│   │       ├── summarizer.service.ts   # 摘要服务
│   │       ├── summarizer.types.ts    # 类型定义
│   │       └── index.ts               # 模块导出
│   │
│   ├── session/
│   │   ├── session.service.ts    # 会话服务（含压缩逻辑）
│   │   └── session.types.ts      # 会话类型
│   │
│   └── config/
│       └── config.service.ts     # 配置服务（含模型 contextWindow）
│
└── cli/
    └── commands.ts               # CLI 命令（含 /compact）
```

---

## 9. 流程图

### 9.1 完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     完整对话流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户发送消息                                                    │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 加载消息（只加载永久消息 keepContext=true）            │   │
│  │    if (session.summaryMessageId) {                      │   │
│  │      messages = getMessagesFrom(summaryMessageId, true) │   │
│  │      messages[0].role = 'user'                          │   │
│  │    } else {                                             │   │
│  │      messages = getAllMessages(sessionId, true)         │   │
│  │    }                                                    │   │
│  │    // 过滤掉测试日志、调试输出等临时消息                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. 添加当前用户消息                                       │   │
│  │    messages.push(currentUserMessage)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. 调用 AI 处理                                          │   │
│  │    response = await aiProvider.sendMessages(messages)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. 保存消息（根据 AI 输出设置 keepContext）               │   │
│  │    createMessage(sessionId, userMessage, true)          │   │
│  │    createMessage(sessionId, assistantMessage, keepCtx)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 5. 更新 token 统计                                        │   │
│  │    updateTokenUsage(sessionId, promptTokens, ...)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 6. 检查是否需要压缩                                       │   │
│  │    threshold = calculateThreshold(config, model)        │   │
│  │    if (tokens >= threshold && autoCompact) {            │   │
│  │      await compact(sessionId, summarizer)               │   │
│  │    }                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  返回响应给用户                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 压缩触发判断

```
┌─────────────────────────────────────────────────────────────────┐
│                    压缩触发判断                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入：                                                          │
│  - session.promptTokens: 输入 token 数                           │
│  - session.completionTokens: 输出 token 数                       │
│  - model.contextWindow: 模型上下文窗口大小                        │
│  - config.ai.context.mode: 'fixed' | 'percentage'               │
│  - config.ai.context.autoCompact: boolean                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 1: 检查 autoCompact 是否启用                        │   │
│  │ if (!autoCompact) return false                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 2: 计算阈值                                          │   │
│  │ if (mode === 'fixed') {                                 │   │
│  │   threshold = config.ai.context.maxTokens  // 如 10000   │   │
│  │ } else {                                                │   │
│  │   threshold = model.contextWindow * percentage          │   │
│  │   // 如 200000 * 0.95 = 190000                          │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 3: 比较总 token 数                                   │   │
│  │ totalTokens = promptTokens + completionTokens           │   │
│  │ return totalTokens >= threshold                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  示例：                                                          │
│  - Fixed 模式：threshold = 10000, 当 tokens >= 10000 时触发       │
│  - Percentage 模式：model.contextWindow = 200000,                │
│    threshold = 200000 * 0.95 = 190000                           │
│    当 tokens >= 190000 时触发                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. API 设计

### 10.1 压缩相关 API

```typescript
// 手动触发压缩
POST /api/sessions/:sessionId/compact
Response: {
  success: boolean;
  summaryMessageId?: string;
  tokensBefore: number;
  tokensAfter: number;
  error?: string;
}

// 获取 session 统计信息
GET /api/sessions/:sessionId/stats
Response: {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  threshold: number;
  percentUsed: number;  // 百分比
  willCompact: boolean; // 是否即将触发压缩
}

// 更新压缩配置
PUT /api/config/context
Body: {
  mode?: 'fixed' | 'percentage';
  maxTokens?: number;
  percentage?: number;
  autoCompact?: boolean;
}
```

### 10.2 配置更新

```typescript
// 更新上下文配置
async function updateContextConfig(newConfig: Partial<ContextConfig>): Promise<void> {
  const current = await loadConfig();
  
  if (newConfig.mode !== undefined) {
    current.ai.context.mode = newConfig.mode;
  }
  if (newConfig.maxTokens !== undefined) {
    current.ai.context.maxTokens = newConfig.maxTokens;
  }
  if (newConfig.percentage !== undefined) {
    current.ai.context.percentage = newConfig.percentage;
  }
  if (newConfig.autoCompact !== undefined) {
    current.ai.context.autoCompact = newConfig.autoCompact;
  }
  
  await saveConfig(current);
}
```

---

## 11. /compact 命令

用户可以通过 `/compact` 命令手动触发上下文压缩。

### 11.1 命令注册

```typescript
// src/cli/commands.ts

import { summarizerService } from '../modules/ai/summarizer/index.js';

// 在 help 命令中添加说明
registerCommand('help', () => ({
  success: true,
  message: `
可用命令:
  /help          - 显示帮助信息
  /compact       - 手动压缩当前会话上下文
  /new [title]   - 创建新会话
  /sessions      - 列出所有会话
  /switch <id>   - 切换到指定会话
  /delete <id>   - 删除指定会话
  /skills        - 列出所有技能
  /use <skill>   - 使用指定技能
  /providers     - 列出所有服务商
  /models        - 列出所有模型
  /model <id>    - 切换模型
  /token         - 查看 Token 统计
  /config <k=v>  - 设置配置项
  /clear         - 清除当前会话
  /exit          - 退出程序
`,
}));

// 注册 /compact 命令
registerCommand('compact', async () => {
  const currentSessionId = sessionService.getCurrentId();
  
  if (!currentSessionId) {
    return { 
      success: false, 
      message: '当前没有活动会话，请先创建或切换会话' 
    };
  }
  
  const session = sessionService.get(currentSessionId);
  if (!session) {
    return { 
      success: false, 
      message: '会话不存在' 
    };
  }
  
  // 检查是否有消息需要压缩
  const messages = memoryService.getAllMessages(currentSessionId);
  if (messages.length === 0) {
    return { 
      success: false, 
      message: '当前会话没有消息，无需压缩' 
    };
  }
  
  const tokensBefore = session.promptTokens + session.completionTokens;
  
  // 执行压缩
  const result = await summarizerService.compact({
    sessionId: currentSessionId,
    onProgress: (msg) => console.log(`[Compact] ${msg}`),
  });
  
  if (!result.success) {
    return { 
      success: false, 
      message: `压缩失败: ${result.error}` 
    };
  }
  
  return { 
    success: true, 
    message: `压缩完成!\n` +
      `  - 压缩前: ${tokensBefore} tokens\n` +
      `  - 压缩后: ${result.tokensAfter} tokens\n` +
      `  - 摘要长度: ${result.summary.length} 字符`,
    data: result 
  };
});
```

### 11.2 命令执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    /compact 命令流程                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 用户输入 /compact                                           │
│         ↓                                                       │
│  2. 检查当前会话是否存在                                         │
│     if (!currentSessionId) return error                         │
│         ↓                                                       │
│  3. 检查是否有消息需要压缩                                       │
│     if (messages.length === 0) return error                     │
│         ↓                                                       │
│  4. 显示进度：正在生成摘要...                                    │
│         ↓                                                       │
│  5. 调用 SummarizerService.compact()                            │
│     - 使用与 ReAct 相同的模型                                    │
│     - 生成详细摘要                                               │
│         ↓                                                       │
│  6. 显示进度：正在保存摘要...                                    │
│         ↓                                                       │
│  7. 更新 session.summaryMessageId                               │
│     重置 session token 计数                                      │
│         ↓                                                       │
│  8. 返回压缩结果                                                 │
│     - 压缩前后 token 数                                          │
│     - 摘要长度                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 前端 UI 集成

```typescript
// src/components/App.tsx

// 在命令处理中添加 /compact 支持
const handleCommand = async (input: string) => {
  if (input === '/compact') {
    addMessage('system', '正在压缩会话上下文...');
    
    try {
      const response = await fetch('/api/sessions/current/compact', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        addMessage('system', result.message);
      } else {
        addMessage('system', `压缩失败: ${result.message}`);
      }
    } catch (error) {
      addMessage('system', `压缩出错: ${error.message}`);
    }
    
    return true;
  }
  
  return false;
};
```

---

## 12. 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| 固定 N 条消息 | 简单 | 丢失上下文 |
| 固定 token 阈值 | 简单、可控 | 不适配不同模型 |
| 百分比模式 | 自适应模型窗口 | 需要模型配置 |
| AI 压缩（OpenCode） | 智能摘要、保留关键信息 | 额外 API 调用成本 |

## 13. 推荐方案

采用**混合模式 + AI 压缩**：

```
┌─────────────────────────────────────────────────────────────────┐
│                     推荐配置策略                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  默认配置：                                                      │
│  {                                                              │
│    mode: 'fixed',        // 默认使用固定模式                      │
│    maxTokens: 10000,     // 默认 10k token                       │
│    percentage: 0.95,     // 百分比模式下 95%                      │
│    autoCompact: true     // 默认启用自动压缩                      │
│  }                                                              │
│                                                                 │
│  用户可选项：                                                    │
│  1. 固定模式：适合快速测试，阈值固定                              │
│  2. 百分比模式：适合生产环境，自适应模型窗口                       │
│  3. 手动触发：用户主动 /compact 命令                              │
│                                                                 │
│  模型配置：                                                      │
│  - 在 models 表配置 contextWindow 字段                           │
│  - 内置常用模型的默认值                                           │
│  - 支持用户自定义模型配置                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. 实现优先级

1. **Phase 1: 基础设施**
   - 更新数据库 schema（sessions、models 表）
   - 更新配置文件结构
   - 添加 token 统计

2. **Phase 2: 核心功能**
   - 实现阈值计算逻辑
   - 实现消息加载逻辑（从摘要开始）
   - 实现 AI 摘要生成

3. **Phase 3: API 和 UI**
   - 实现压缩 API
   - 实现统计 API
   - 实现配置更新 API

4. **Phase 4: 优化**
   - 摘要质量优化
   - 性能优化
   - 错误处理