/**
 * 聊天 API 路由模块
 * 
 * 本模块提供聊天相关的 RESTful API 接口
 * 
 * 路由列表：
 * - POST /api/chat         -> 发送聊天消息 (非流式)
 * - POST /api/chat/stream  -> 发送聊天消息 (流式响应)
 * - GET  /api/chat/history/:sessionId -> 获取会话历史消息
 * 
 * 请求示例：
 *   POST /api/chat
 *   {
 *     "message": "帮我读取 src/index.ts 文件",
 *     "sessionId": "optional-session-id",
 *     "projectPath": "optional-project-path"
 *   }
 */

import { Router, Request, Response } from 'express';
import { aiService } from '../modules/ai/index.js';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { skillsManager } from '../modules/skill/index.js';
import { logger } from '../modules/logger/logger.js';
import { ApiResponse, ChatRequest } from './api.types.js';

/**
 * 创建聊天路由 Router
 * 
 * Express Router 用于组织相关的路由和中间件
 * 所有以 /chat 开头的请求都会路由到这里
 */
export const chatRouter = Router();

/**
 * POST /api/chat
 * 
 * 发送聊天消息接口 (非流式)
 * 
 * 请求流程：
 * 1. 接收客户端请求参数 (message, sessionId, projectPath)
 * 2. 检查或创建会话 (session)
 * 3. 切换到当前会话
 * 4. 调用 AI 服务处理消息
 * 5. 返回 AI 响应结果
 * 
 * @param {ChatRequest} req.body - 请求体
 *   - message: 用户消息内容 (必填)
 *   - sessionId: 会话 ID (可选，不提供则创建新会话)
 *   - projectPath: 项目路径 (可选，用于加载项目上下文)
 *   - skill: 技能名称 (可选，加载指定技能)
 * 
 * @returns {ApiResponse} 响应体
 *   - success: 请求是否成功
 *   - data: {
 *       - sessionId: 会话 ID
 *       - response: AI 响应内容
 *       - reactSteps: ReAct 执行步骤 (调试用)
 *       - iterations: 迭代次数
 *       - success: AI 是否成功完成任务
 *       - error: 错误信息 (如果有)
 *     }
 */
chatRouter.post('/', async (req: Request, res: Response) => {
  // ========== 步骤 1: 接收请求参数 ==========
  // 从请求体中解构聊天请求参数
  const { message, sessionId, projectPath, skill } = req.body as ChatRequest;

  // 记录请求日志
  logger.logRequest('/api/chat', { message, sessionId, projectPath });

  try {
    // ========== 步骤 2: 检查或创建会话 ==========
    /**
     * 会话管理逻辑：
     * - 如果提供了 sessionId，尝试获取已存在的会话
     * - 如果会话不存在或未提供 sessionId，创建新会话
     * 
     * 会话创建时传入 projectPath，用于：
     * - 加载项目的 .gitignore、node_modules 等配置
     * - 提供更准确的项目上下文给 AI
     */
    let session = sessionId ? sessionService.get(sessionId) : null;
    
    if (!session) {
      // 创建新会话，标题为 'New Chat'
      session = sessionService.create('New Chat', projectPath);
    }

    // ========== 步骤 3: 切换到当前会话 ==========
    // 设置当前会话为活跃状态，后续操作都基于此会话
    sessionService.switchTo(session.id);

    // ========== 步骤 4: 准备 ReAct 执行 ==========
    // 创建数组存储 ReAct 执行过程中的每一步
    // 用于返回给客户端，便于调试和展示思考过程
    const reactSteps: any[] = [];

    /**
     * 调用 AI 服务处理消息
     * 
     * chatWithReAct 是核心方法，执行 ReAct 循环：
     * 1. 构建系统提示词 (包含工具定义)
     * 2. 添加用户消息和历史消息
     * 3. 循环调用 AI：
     *    - AI 返回 Thought + Action
     *    - 执行工具 (如 read_file)
     *    - 将结果返回给 AI
     *    - 重复直到得到最终答案
     * 
     * @param message - 用户输入的问题
     * @param options - 配置选项
     *   - sessionId: 会话 ID
     *   - projectPath: 项目路径
     *   - memoryService: 记忆服务
     *   - onStep: 每一步执行完的回调 (用于收集步骤)
     */
    const result = await aiService.chatWithReAct(message, {
      sessionId: session.id,
      projectPath: session.projectPath || undefined,
      memoryService,
      // onStep 回调：在 ReAct 循环的每一步执行后调用
      // 收集 Thought、Action、ActionInput、Observation 等信息
      onStep: (step, iteration) => {
        reactSteps.push({
          iteration,                             // 当前迭代次数
          thought: step.thought,                 // AI 的思考过程
          action: step.action,                   // 要执行的工具名称
          actionInput: typeof step.actionInput === 'string' 
            ? step.actionInput                   // 如果是字符串直接使用
            : JSON.stringify(step.actionInput), // 如果是对象序列化为字符串
          observation: step.observation,         // 工具执行结果
          keepContext: step.keepContext,         // 是否保留到长期记忆
        });
      },
    });

    // ========== 步骤 5: 返回响应 ==========
    const responseData = {
      sessionId: session.id,
      response: result.answer || result.steps[result.steps.length - 1]?.thought,
      reactSteps: reactSteps.length > 0 ? reactSteps : undefined,
      iterations: result.iterations,
      success: result.success,
      error: result.error,
    };

    // 记录响应日志
    logger.logResponse('/api/chat', responseData);

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    // ========== 错误处理 ==========
    // 记录错误日志
    logger.logResponse('/api/chat/error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // 捕获异常，返回 500 错误
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/chat/stream
 * 
 * 发送聊天消息接口 (流式响应)
 * 
 * 与 POST / 的区别：
 * - 使用 Server-Sent Events (SSE) 流式返回 AI 响应
 * - 客户端可以逐步接收响应，实现打字机效果
 * - 适用于需要实时展示 AI 回复的场景
 * 
 * 请求流程：
 * 1. 接收请求参数
 * 2. 检查或创建会话
 * 3. 添加用户消息到记忆
 * 4. 以流式方式调用 AI 服务
 * 5. 将每个 chunk 通过 SSE 发送给客户端
 * 
 * @returns {Server-Sent Events}
 *   格式: data: { chunk: "AI 回复内容" }\n\n
 *   结束: data: [DONE]\n\n
 */
chatRouter.post('/stream', async (req: Request, res: Response) => {
  // ========== 设置 SSE 响应头 ==========
  // Content-Type: text/event-stream - SSE 格式
  // Cache-Control: no-cache - 禁止缓存
  // Connection: keep-alive - 保持长连接
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { message, sessionId, projectPath } = req.body as ChatRequest;

  try {
    // ========== 会话处理 ==========
    let session = sessionId ? sessionService.get(sessionId) : null;
    
    if (!session) {
      session = sessionService.create('New Chat', projectPath);
    }

    sessionService.switchTo(session.id);
    
    // ========== 添加用户消息到记忆 ==========
    // 将用户消息添加到数据库，作为会话历史的一部分
    memoryService.addMessage(session.id, 'user', message, true);

    // ========== 获取历史消息 ==========
    // 获取所有需要发送给 AI 的历史消息
    const messages = memoryService.getPermanentMessages(session.id);

    // ========== 流式调用 AI ==========
    // for await...of 语法用于遍历异步生成器
    // aiService.chatStream 逐块返回 AI 的响应
    for await (const chunk of aiService.chatStream(
      messages.map(m => ({ role: m.role, content: m.content }))
    )) {
      // ========== 发送数据块 ==========
      // 格式: data: { chunk: "内容" }\n\n
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // ========== 发送结束标记 ==========
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    // ========== 错误处理 ==========
    // 发送错误信息并结束连接
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat/history/:sessionId
 * 
 * 获取指定会话的历史消息
 * 
 * @param {string} req.params.sessionId - 会话 ID (URL 参数)
 * 
 * @returns {ApiResponse}
 *   - success: 请求是否成功
 *   - data: Message[] - 消息数组，包含所有历史消息
 */
import { reactParser } from '../modules/ai/react/react.parser.js';

chatRouter.get('/history/:sessionId', (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);

  try {
    const messages = memoryService.getAllMessages(sessionId);
    
    const result: any[] = [];
    let foundUser = false;

    for (const msg of messages) {
      if (msg.role === 'user' && (msg as any).isOriginal) {
        if (!foundUser) {
          result.push({ type: 'chat', content: msg.content });
          foundUser = true;
        }
        continue;
      }

      if (msg.role === 'assistant') {
        const parsed = reactParser.parse(msg.content);
        
        if (parsed.steps.length === 0) {
          result.push({
            type: 'step',
            thought: msg.content,
            action: '',
            input: '',
            success: true
          });
        } else {
          for (const step of parsed.steps) {
            result.push({ 
              type: 'step', 
              thought: step.thought || '',
              action: step.action || '',
              input: step.actionInput ? (typeof step.actionInput === 'string' ? step.actionInput : JSON.stringify(step.actionInput)) : '',
              success: true 
            });
          }
        }
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
