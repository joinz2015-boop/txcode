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
import { logger } from '../modules/logger/logger.js';
import { ApiResponse, ChatRequest } from './api.types.js';
import { codeChatService } from '../services/codeChat/index.js';
import { commandChatService } from '../services/commandChat/index.js';
import { executeCommand } from '../cli/commands.js';

function calculateCost(usage?: { promptTokens?: number; completionTokens?: number }): number {
  if (!usage) return 0;
  const promptCost = (usage.promptTokens || 0) * 0.00015 / 1000;
  const completionCost = (usage.completionTokens || 0) * 0.0006 / 1000;
  return promptCost + completionCost;
}

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
  const { message, sessionId, projectPath, modelName } = req.body as ChatRequest;

  try {
    if (message && message.trim().startsWith('/')) {
      const result = await commandChatService.handleCommand({
        message,
        sessionId,
      });
      return res.json({
        success: true,
        data: result,
      });
    }

    const result = await codeChatService.handleChat({
      message,
      sessionId,
      projectPath,
      modelName,
    });

    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        response: result.answer,
        reactSteps: result.reactSteps,
        iterations: result.iterations,
      },
    });
  } catch (error) {
    logger.logResponse('/api/chat/error', { error: error instanceof Error ? error.message : 'Unknown error' });
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
 * POST /api/chat/command
 * 
 * 执行 CLI 命令接口
 * 
 * 请求流程：
 * 1. 接收命令内容
 * 2. 调用 executeCommand 执行命令
 * 3. 返回命令执行结果
 * 
 * @param {ChatRequest} req.body - 请求体
 *   - message: 命令内容 (必填，以 / 开头)
 *   - sessionId: 会话 ID (可选)
 * 
 * @returns {ApiResponse}
 *   - success: 请求是否成功
 *   - data: {
 *       - response: 命令执行结果文本
 *       - sessionId: 会话 ID (如果有)
 *     }
 */
chatRouter.post('/command', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as ChatRequest;

  logger.logRequest('/api/chat/command', { message, sessionId });

  try {
    if (!message || !message.trim().startsWith('/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid command. Commands must start with /',
      });
    }

    // 如果没有 sessionId，创建一个新会话
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = sessionService.create('Command Session');
      sessionService.switchTo(session.id);
      currentSessionId = session.id;
    }

    // 执行命令
    const cmdResult = await executeCommand(message.trim());

    // 添加到记忆
    memoryService.addMessage(currentSessionId, 'user', message, true);
    memoryService.addMessage(currentSessionId, 'assistant', cmdResult.message || '命令已执行', true);

    logger.logResponse('/api/chat/command', {
      success: cmdResult.success,
      response: cmdResult.message,
    });

    res.json({
      success: true,
      data: {
        response: cmdResult.message || '命令已执行',
        sessionId: cmdResult.data?.id || currentSessionId,
        success: cmdResult.success,
      },
    });
  } catch (error) {
    logger.logResponse('/api/chat/command/error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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

chatRouter.get('/history/:sessionId', async (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);

  try {
    const messages = memoryService.getAllMessages(sessionId);
    
    const result: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'user' && (msg as any).isOriginal) {
        result.push({ type: 'chat', role: 'user', content: msg.content });
      }
      
      if (msg.role === 'assistant') {
        let thought = '';
        let toolCalls: any[] = [];
        let success = true;
        
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.type === 'assistant_with_tools' && parsed.toolCalls) {
            thought = parsed.thought || '';
            success = parsed.success !== false;
            toolCalls = parsed.toolCalls;
          }
        } catch {
          thought = msg.content;
        }
        
        result.push({ 
          type: 'step', 
          role: 'assistant',
          thought,
          toolCalls,
          success 
        });
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
