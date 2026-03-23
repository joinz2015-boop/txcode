/**
 * 记忆服务模块
 * 
 * 本模块负责会话消息 (Message) 的管理和操作
 * 
 * 核心概念：
 * 1. 永久消息 (keepContext = true)
 *    - 保留在会话历史中
 *    - 发送给 AI 作为上下文
 *    - 可以被压缩但不会被删除
 * 
 * 2. 临时消息 (keepContext = false)
 *    - 仅用于当前对话轮次
 *    - 不会被发送给 AI
 *    - 压缩时会被删除
 * 
 * 3. 摘要消息 (summaryMessageId)
 *    - 压缩会话时生成
 *    - 记录压缩点位置
 *    - 从该位置之后的消息才是有效的
 * 
 * 典型使用场景：
 * - 添加用户/助手消息到会话历史
 * - 获取需要发送给 AI 的消息列表
 * - 会话压缩时删除旧消息
 * - 查询会话消息统计
 */

import { DbService, dbService as defaultDbService } from '../db/db.service.js';
import { Message } from './memory.types.js';

/**
 * MemoryService 类
 * 
 * 记忆服务管理会话中的所有消息
 * 提供消息的 CRUD 操作和查询功能
 * 
 * 数据模型：
 * - Message: 包含 id, sessionId, role, content, keepContext, createdAt
 * 
 * 消息角色 (role)：
 * - user: 用户消息
 * - assistant: AI 助手消息
 * - system: 系统消息
 * - tool: 工具执行结果
 */
export class MemoryService {
  /** 数据库服务实例 */
  private db: DbService;

  /**
   * 构造函数
   * 
   * @param db - 数据库服务实例，如果未提供则使用默认实例
   */
  constructor(db?: DbService) {
    this.db = db || defaultDbService;
  }

  /**
   * 添加消息
   * 
   * 将消息插入数据库
   * 
   * @param sessionId - 所属会话 ID
   * @param role - 消息角色 (user/assistant/system/tool)
   * @param content - 消息内容
   * @param keepContext - 是否保留到长期记忆，默认 true
   * @returns {number} 插入消息的 ID
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean = true
  ): number {
    // 执行 INSERT 语句
    const result = this.db.run(
      'INSERT INTO messages (session_id, role, content, keep_context) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, keepContext ? 1 : 0]  // keepContext 转换为 0/1
    );
    // 返回插入行的 ID
    return Number(result.lastInsertRowid);
  }

  /**
   * 获取单条消息
   * 
   * @param id - 消息 ID
   * @returns {Message | undefined} 消息对象
   */
  getMessage(id: number): Message | undefined {
    const row = this.db.get<any>('SELECT * FROM messages WHERE id = ?', [id]);
    return row ? this.rowToMessage(row) : undefined;
  }

  /**
   * 获取所有消息
   * 
   * 获取指定会话的所有消息 (永久 + 临时)
   * 按创建时间排序
   * 
   * @param sessionId - 会话 ID
   * @returns {Message[]} 消息数组
   */
  getAllMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  /**
   * 获取永久消息
   * 
   * 只返回 keepContext = true 的消息
   * 这些消息会被发送给 AI 作为上下文
   * 
   * @param sessionId - 会话 ID
   * @returns {Message[]} 永久消息数组
   */
  getPermanentMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? AND keep_context = 1 ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  /**
   * 获取临时消息
   * 
   * 只返回 keepContext = false 的消息
   * 这些消息不会发送给 AI
   * 
   * @param sessionId - 会话 ID
   * @returns {Message[]} 临时消息数组
   */
  getTemporaryMessages(sessionId: string): Message[] {
    const rows = this.db.all<any>(
      'SELECT * FROM messages WHERE session_id = ? AND keep_context = 0 ORDER BY created_at',
      [sessionId]
    );
    return rows.map(this.rowToMessage);
  }

  /**
   * 从指定消息开始获取消息
   * 
   * 用于会话压缩后从摘要点获取后续消息
   * 
   * @param fromId - 起始消息 ID
   * @param keepContextOnly - 是否只获取永久消息，默认 true
   * @returns {Message[]} 消息数组
   */
  getMessagesFrom(fromId: number, keepContextOnly: boolean = true): Message[] {
    // 先获取起始消息，获取 session_id
    const message = this.db.get<any>(
      'SELECT * FROM messages WHERE id = ?',
      [fromId]
    );

    if (!message) return [];

    // 构建查询语句
    let sql = 'SELECT * FROM messages WHERE session_id = ? AND id >= ?';
    const params: unknown[] = [message.session_id, fromId];

    // 如果只获取永久消息
    if (keepContextOnly) {
      sql += ' AND keep_context = 1';
    }

    sql += ' ORDER BY id ASC';

    const rows = this.db.all<any>(sql, params);
    return rows.map(this.rowToMessage);
  }

  /**
   * 获取发送给 AI 的消息
   * 
   * 根据是否有摘要消息 ID 返回不同的消息列表：
   * - 如果有摘要：从摘要消息之后获取
   * - 如果没有摘要：获取所有永久消息
   * 
   * @param sessionId - 会话 ID
   * @param summaryMessageId - 摘要消息 ID (可选)
   * @returns {Message[]} 发送给 AI 的消息列表
   */
  getMessagesForAI(sessionId: string, summaryMessageId: number | null): Message[] {
    let messages: Message[];

    // ========== 有摘要消息的情况 ==========
    if (summaryMessageId) {
      // 从摘要消息之后获取永久消息
      messages = this.getMessagesFrom(summaryMessageId, true);
      
      // 第一条消息的角色从 system 改为 user
      // 因为摘要消息本身是 AI 生成的摘要，需要伪装成用户消息
      if (messages.length > 0 && messages[0].id === summaryMessageId) {
        messages[0] = {
          ...messages[0],
          role: 'user',
        };
      }
    } 
    // ========== 没有摘要消息的情况 ==========
    else {
      // 获取所有永久消息
      messages = this.getPermanentMessages(sessionId);
    }

    return messages;
  }

  /**
   * 删除单条消息
   * 
   * @param id - 消息 ID
   */
  deleteMessage(id: number): void {
    this.db.run('DELETE FROM messages WHERE id = ?', [id]);
  }

  /**
   * 删除指定消息之前的所有消息
   * 
   * 用于会话压缩前删除旧消息
   * 
   * @param sessionId - 会话 ID
   * @param beforeId - 截止消息 ID
   */
  deleteMessagesBefore(sessionId: string, beforeId: number): void {
    // 获取截止消息的创建时间
    const message = this.db.get<any>(
      'SELECT created_at FROM messages WHERE id = ?',
      [beforeId]
    );
    if (message) {
      this.db.run(
        'DELETE FROM messages WHERE session_id = ? AND created_at < ?',
        [sessionId, message.created_at]
      );
    }
  }

  /**
   * 压缩会话
   * 
   * 删除多余的永久消息，只保留最近 N 条
   * 
   * 压缩策略：
   * - 获取所有永久消息，按时间降序
   * - 删除超出保留数量的旧消息
   * - 使用事务确保原子性
   * 
   * @param sessionId - 会话 ID
   * @param keepCount - 保留的消息数量
   */
  compressSession(sessionId: string, keepCount: number): void {
    // 使用事务确保操作的原子性
    this.db.transaction(() => {
      // 获取所有永久消息 ID，按时间降序
      const messages = this.db.all<any>(
        'SELECT id FROM messages WHERE session_id = ? AND keep_context = 1 ORDER BY created_at DESC',
        [sessionId]
      );
      
      // 如果消息数量超过保留数量
      if (messages.length > keepCount) {
        // 找出需要删除的消息 ID (跳过前 keepCount 条)
        const toDelete = messages.slice(keepCount).map((m: any) => m.id);
        
        if (toDelete.length > 0) {
          // 批量删除
          const placeholders = toDelete.map(() => '?').join(',');
          this.db.run(`DELETE FROM messages WHERE id IN (${placeholders})`, toDelete);
        }
      }
    });
  }

  /**
   * 获取会话统计
   * 
   * @param sessionId - 会话 ID
   * @returns 统计对象
   */
  getSessionStats(sessionId: string): { 
    totalMessages: number;      // 总消息数
    permanentMessages: number;  // 永久消息数
    compressedCount: number;    // 已压缩消息数 (总 - 永久)
  } {
    // 获取总消息数
    const total = this.db.get<{count: number}>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
      [sessionId]
    );
    // 获取永久消息数
    const permanent = this.db.get<{count: number}>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND keep_context = 1',
      [sessionId]
    );
    
    return {
      totalMessages: total?.count || 0,
      permanentMessages: permanent?.count || 0,
      compressedCount: (total?.count || 0) - (permanent?.count || 0),
    };
  }

  /**
   * 将数据库行转换为 Message 对象
   * 
   * 数据库字段使用下划线命名
   * Message 对象使用驼峰命名
   * 
   * @param row - 数据库行对象
   * @returns {Message} Message 对象
   */
  private rowToMessage(row: any): Message {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      keepContext: Boolean(row.keep_context),  // 转换 0/1 为 true/false
      createdAt: row.created_at,
    };
  }
}

/**
 * 记忆服务单例实例
 * 
 * 在整个应用中共享同一个 MemoryService 实例
 * 
 * 使用方式：
 *   import { memoryService } from '../memory/index.js';
 *   
 *   // 添加消息
 *   memoryService.addMessage(sessionId, 'user', '你好', true);
 *   
 *   // 获取消息
 *   const messages = memoryService.getPermanentMessages(sessionId);
 */
export const memoryService = new MemoryService();