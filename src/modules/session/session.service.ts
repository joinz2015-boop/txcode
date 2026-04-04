/**
 * 会话服务模块
 * 
 * 本模块负责会话 (Session) 的管理和操作
 * 
 * 核心功能：
 * 1. 会话 CRUD - 创建、读取、更新、删除会话
 * 2. 会话切换 - 维护当前活跃的会话
 * 3. 状态管理 - 缓存会话列表和当前会话 ID
 * 4. Token 统计 - 追踪每个会话的 Token 使用量
 * 5. 上下文压缩 - 记录摘要消息位置，供压缩算法使用
 * 6. 项目关联 - 将会话与项目路径关联
 * 
 * 数据模型：
 * - Session: 包含 id, title, projectPath, summaryMessageId, 
 *            promptTokens, completionTokens, cost, createdAt, updatedAt
 * - SessionState: 包含 currentSessionId 和 sessions 数组
 * 
 * 典型使用场景：
 * - 用户开始新对话时创建会话
 * - 用户切换不同项目时切换会话
 * - 查看会话历史记录
 * - 统计 Token 使用量 (用于计费或配额控制)
 */

import { v4 as uuidv4 } from 'uuid';
import { DbService, dbService as defaultDbService } from '../db/db.service.js';
import { memoryService } from '../memory/index.js';
import { Session, SessionState, CompactionResult, SessionStats } from './session.types.js';
import { Message } from '../memory/memory.types.js';

/**
 * SessionService 类
 * 
 * 会话服务提供会话的完整生命周期管理
 * 每个会话代表用户与 AI 的一次对话会话
 * 
 * 会话状态说明：
 * - currentSessionId: 当前活跃的会话 ID
 * - sessions: 内存中缓存的会话列表
 * 
 * 持久化：
 * - 所有会话数据存储在 SQLite 数据库的 sessions 表中
 * - 内存中维护状态缓存，用于快速访问
 */
export class SessionService {
  /** 数据库服务实例 */
  private db: DbService;
  
  /**
   * 会话状态
   * 
   * 维护当前会话 ID 和会话列表的缓存
   * 初始状态：没有当前会话，没有缓存的会话
   */
  private state: SessionState = {
    currentSessionId: null,  // 当前活跃会话 ID
    sessions: [],            // 缓存的会话列表
  };

  /**
   * 构造函数
   * 
   * @param db - 数据库服务实例，如果未提供则使用默认实例
   * 
   * 注意：SessionService 依赖 DbService，需要确保数据库已初始化
   */
  constructor(db?: DbService) {
    this.db = db || defaultDbService;
  }

  /**
   * 创建新会话
   * 
   * 执行流程：
   * 1. 生成唯一的 UUID 作为会话 ID
   * 2. 将会话信息插入数据库
   * 3. 从数据库读取刚创建的会话对象
   * 4. 将新会话添加到内存缓存的最前面
   * 
   * @param title - 会话标题，如 "Chat Session"
   * @param projectPath - 项目路径 (可选)，用于关联特定项目
   * @returns {Session} 创建的会话对象
   */
  create(title: string, projectPath?: string): Session {
    return this.createWithId(uuidv4(), title, projectPath);
  }

  createWithId(id: string, title: string, projectPath?: string): Session {
    this.db.run(
      'INSERT INTO sessions (id, title, project_path) VALUES (?, ?, ?)',
      [id, title, projectPath || null]
    );
    const session = this.get(id)!;
    this.state.sessions.unshift(session);
    return session;
  }

  /**
   * 获取会话
   * 
   * 根据会话 ID 从数据库查询会话信息
   * 
   * @param id - 会话 ID
   * @returns {Session | undefined} 会话对象，如果不存在则返回 undefined
   */
  get(id: string): Session | undefined {
    // 查询单条记录
    const row = this.db.get<any>('SELECT * FROM sessions WHERE id = ?', [id]);
    return row ? this.rowToSession(row) : undefined;
  }

  /**
   * 获取所有会话
   * 
   * 从数据库查询所有会话，按更新时间降序排列
   * 同时更新内存中的会话缓存
   * 
   * @returns {Session[]} 会话数组
   */
  getAll(): Session[] {
    // 查询所有记录，按 updated_at 降序 (最近更新的在前)
    const rows = this.db.all<any>('SELECT * FROM sessions ORDER BY updated_at DESC');
    
    // 更新内存缓存
    this.state.sessions = rows.map(this.rowToSession);
    
    return this.state.sessions;
  }

  /**
   * 更新会话
   * 
   * 可更新字段：title, projectPath
   * 同时更新数据库和内存缓存
   * 
   * @param id - 会话 ID
   * @param data - 要更新的字段
   */
  update(id: string, data: Partial<Pick<Session, 'title' | 'projectPath' | 'status'>>): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    // 构建动态更新语句
    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.projectPath !== undefined) {
      updates.push('project_path = ?');
      values.push(data.projectPath);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    // 如果有需要更新的字段
    if (updates.length > 0) {
      // 添加 updated_at 自动更新
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      // 执行 UPDATE 语句
      this.db.run(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`, values);
      
      // 更新内存缓存中的会话对象
      const index = this.state.sessions.findIndex(s => s.id === id);
      if (index !== -1) {
        this.state.sessions[index] = this.get(id)!;
      }
    }
  }

  /**
   * 删除会话
   * 
   * 从数据库删除会话记录
   * 同时清理内存缓存
   * 
   * 注意：如果删除的是当前会话，需要清空 currentSessionId
   * 
   * @param id - 会话 ID
   */
  delete(id: string): void {
    // 删除会话的所有消息
    this.db.run('DELETE FROM messages WHERE session_id = ?', [id]);
    // 删除数据库记录
    this.db.run('DELETE FROM sessions WHERE id = ?', [id]);
    
    // 如果删除的是当前会话，清空当前会话 ID
    if (this.state.currentSessionId === id) {
      this.state.currentSessionId = null;
    }
    
    // 从内存缓存中移除
    this.state.sessions = this.state.sessions.filter(s => s.id !== id);
  }

  /**
   * 更新会话的访问时间
   * 
   * 每次访问或操作会话时调用
   * 用于排序最近使用的会话
   * 
   * @param id - 会话 ID
   */
  touch(id: string): void {
    this.db.run('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  /**
   * 切换到指定会话
   * 
   * 将当前活跃会话切换为指定会话
   * 同时更新该会话的访问时间
   * 
   * @param id - 要切换到的会话 ID
   * @returns {Session | undefined} 切换后的会话对象
   */
  switchTo(id: string): Session | undefined {
    const session = this.get(id);
    if (!session) return undefined;
    
    // 设置当前会话 ID
    this.state.currentSessionId = id;
    // 更新访问时间
    this.touch(id);
    
    return session;
  }

  /**
   * 获取当前会话
   * 
   * @returns {Session | undefined} 当前会话对象，如果没有当前会话则返回 undefined
   */
  getCurrent(): Session | undefined {
    if (!this.state.currentSessionId) return undefined;
    return this.get(this.state.currentSessionId);
  }

  /**
   * 获取当前会话 ID
   * 
   * @returns {string | null} 当前会话 ID，如果没有当前会话则返回 null
   */
  getCurrentId(): string | null {
    return this.state.currentSessionId;
  }

  /**
   * 获取最近的会话列表
   * 
   * @param limit - 返回数量限制，默认 10
   * @returns {Session[]} 最近更新的会话数组
   */
  getRecent(limit: number = 10): Session[] {
    const rows = this.db.all<any>(
      'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(this.rowToSession);
  }

  /**
   * 搜索会话
   * 
   * 根据标题或项目路径搜索会话
   * 
   * @param query - 搜索关键词
   * @returns {Session[]} 匹配的会话数组
   */
  search(query: string): Session[] {
    const rows = this.db.all<any>(
      "SELECT * FROM sessions WHERE title LIKE ? OR project_path LIKE ? ORDER BY updated_at DESC",
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(this.rowToSession);
  }

  /**
   * 清空当前会话
   * 
   * 将 currentSessionId 设置为 null
   * 不删除任何会话数据
   */
  clearCurrent(): void {
    this.state.currentSessionId = null;
  }

  /**
   * 获取会话状态
   * 
   * 返回当前会话 ID 和会话列表的副本
   * 
   * @returns {SessionState} 会话状态对象
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * 根据项目路径获取或创建会话
   * 
   * 如果项目路径已存在会话，返回最近更新的会话
   * 如果不存在，创建新会话
   * 
   * @param projectPath - 项目路径
   * @param title - 标题 (可选，默认根据项目路径生成)
   * @returns {Session} 会话对象
   */
  getOrCreateByPath(projectPath: string, title?: string): Session {
    // 查询该项目的最近会话
    const existing = this.db.get<any>(
      'SELECT * FROM sessions WHERE project_path = ? ORDER BY updated_at DESC LIMIT 1',
      [projectPath]
    );
    
    // 如果存在，返回该会话
    if (existing) {
      return this.rowToSession(existing);
    }
    
    // 如果不存在，创建新会话
    return this.create(title || `Session for ${projectPath}`, projectPath);
  }

  /**
   * 更新 Token 使用统计
   * 
   * 累加会话的 Token 使用量
   * 用于追踪每个会话的资源消耗
   * 
   * @param sessionId - 会话 ID
   * @param promptTokens - 提示词 Token 数量
   * @param completionTokens - 补全 Token 数量
   * @param cost - 费用 (可选，默认 0)
   */
  updateTokenUsage(
    sessionId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number = 0
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
   * 更新摘要消息 ID
   * 
   * 当会话压缩后，记录压缩点位置
   * 下次获取消息时从该位置开始
   * 
   * @param sessionId - 会话 ID
   * @param summaryMessageId - 摘要消息 ID
   */
  updateSummary(sessionId: string, summaryMessageId: number): void {
    this.db.run(
      `UPDATE sessions 
       SET summary_message_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [summaryMessageId, sessionId]
    );
  }

  /**
   * 重置 Token 统计
   * 
   * 将会话的 Token 计数归零
   * 
   * @param sessionId - 会话 ID
   */
  resetTokens(sessionId: string): void {
    this.db.run(
      `UPDATE sessions 
       SET prompt_tokens = 0,
           completion_tokens = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId]
    );
  }

  setProcessing(sessionId: string): void {
    this.update(sessionId, { status: 'processing' });
  }

  setCompleted(sessionId: string): void {
    this.update(sessionId, { status: 'completed' });
  }

  setIdle(sessionId: string): void {
    this.update(sessionId, { status: 'idle' });
  }

  cleanStaleSessions(): void {
    const stale = this.db.all<any>(
      "SELECT id FROM sessions WHERE status = 'processing'"
    );
    if (stale.length > 0) {
      console.log(`[Session] 清理 ${stale.length} 个残留 processing 会话`);
      this.db.run(
        "UPDATE sessions SET status = 'idle' WHERE status = 'processing'"
      );
    }
  }

  /**
   * 获取会话统计信息
   * 
   * @param sessionId - 会话 ID
   * @param threshold - Token 阈值 (用于计算百分比)
   * @returns {SessionStats} 统计信息对象
   */
  getStats(sessionId: string, threshold: number): SessionStats {
    const session = this.get(sessionId);
    if (!session) {
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        threshold,
        percentUsed: 0,
        willCompact: false,
      };
    }

    // 计算总 Token 数
    const totalTokens = session.promptTokens + session.completionTokens;
    // 计算使用百分比
    const percentUsed = threshold > 0 ? Math.round((totalTokens / threshold) * 100) : 0;

    return {
      promptTokens: session.promptTokens,
      completionTokens: session.completionTokens,
      totalTokens,
      threshold,
      percentUsed,
      willCompact: totalTokens >= threshold,  // 是否需要压缩
    };
  }

  /**
   * 将数据库行转换为 Session 对象
   * 
   * 数据库表字段使用下划线命名 (snake_case)
   * Session 对象使用驼峰命名 (camelCase)
   * 
   * @param row - 数据库行对象
   * @returns {Session} Session 对象
   */
  private rowToSession(row: any): Session {
    return {
      id: row.id,
      title: row.title,
      projectPath: row.project_path,
      summaryMessageId: row.summary_message_id ?? null,
      promptTokens: row.prompt_tokens || 0,
      completionTokens: row.completion_tokens || 0,
      cost: row.cost || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status || 'idle',
    };
  }
}

/**
 * 会话服务单例实例
 * 
 * 在整个应用中共享同一个 SessionService 实例
 * 
 * 使用方式：
 *   import { sessionService } from '../session/index.js';
 *   
 *   // 创建会话
 *   const session = sessionService.create('My Chat');
 *   
 *   // 切换会话
 *   sessionService.switchTo(session.id);
 *   
 *   // 获取当前会话
 *   const current = sessionService.getCurrent();
 */
export const sessionService = new SessionService();