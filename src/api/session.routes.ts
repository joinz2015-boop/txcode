/**
 * 会话 API 路由模块
 * 
 * 提供会话 (Session) 的 RESTful API 接口
 * 
 * 路由列表：
 * - GET    /api/sessions           -> 获取所有会话
 * - GET    /api/sessions/current   -> 获取当前会话
 * - POST   /api/sessions           -> 创建新会话
 * - GET    /api/sessions/:id       -> 获取指定会话
 * - PUT    /api/sessions/:id       -> 更新会话
 * - DELETE /api/sessions/:id       -> 删除会话
 * - POST   /api/sessions/:id/switch -> 切换到指定会话
 * - POST   /api/sessions/:id/compact -> 压缩会话历史
 */

import { Router, Request, Response } from 'express';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { configService } from '../modules/config/index.js';
import { SummarizerService } from '../modules/ai/summarizer/index.js';
import { ApiResponse, SessionCreateRequest } from './api.types.js';

/** 创建会话路由 */
export const sessionRouter = Router();

/** 初始化摘要服务 */
const summarizerService = new SummarizerService(sessionService, memoryService, configService);

/**
 * GET /api/sessions
 * 获取所有会话列表
 */
sessionRouter.get('/', (req: Request, res: Response) => {
  const sessions = sessionService.getAll();
  res.json({ success: true, data: sessions });
});

/**
 * GET /api/sessions/current
 * 获取当前活跃的会话
 */
sessionRouter.get('/current', (req: Request, res: Response) => {
  const session = sessionService.getCurrent();
  res.json({ success: true, data: session });
});

/**
 * POST /api/sessions
 * 创建新会话
 */
sessionRouter.post('/', (req: Request, res: Response) => {
  const { title, projectPath } = req.body as SessionCreateRequest;
  const session = sessionService.create(title, projectPath);
  res.status(201).json({ success: true, data: session });
});

/**
 * GET /api/sessions/:id
 * 获取指定会话
 */
sessionRouter.get('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = sessionService.get(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  res.json({ success: true, data: session });
});

/**
 * PUT /api/sessions/:id
 * 更新会话
 */
sessionRouter.put('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { title, projectPath } = req.body;
  
  sessionService.update(id, { title, projectPath });
  const session = sessionService.get(id);
  res.json({ success: true, data: session });
});

/**
 * DELETE /api/sessions/:id
 * 删除会话
 */
sessionRouter.delete('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  sessionService.delete(id);
  res.json({ success: true });
});

/**
 * POST /api/sessions/:id/switch
 * 切换到指定会话
 */
sessionRouter.post('/:id/switch', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = sessionService.switchTo(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  res.json({ success: true, data: session });
});

/**
 * POST /api/sessions/:id/compact
 * 压缩会话历史
 */
sessionRouter.post('/:id/compact', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  
  try {
    await summarizerService.compact({ sessionId: id });
    const session = sessionService.get(id);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/sessions/:id/stats
 * 获取会话统计信息
 */
sessionRouter.get('/:id/stats', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const threshold = Number(req.query.threshold) || 100000;
  
  const stats = sessionService.getStats(id, threshold);
  res.json({ success: true, data: stats });
});

sessionRouter.delete('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  sessionService.delete(id);
  res.json({ success: true, message: 'Session deleted' });
});

sessionRouter.post('/:id/switch', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = sessionService.switchTo(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  res.json({ success: true, data: session });
});

sessionRouter.get('/search/:query', (req: Request, res: Response) => {
  const query = String(req.params.query);
  const sessions = sessionService.search(query);
  res.json({ success: true, data: sessions });
});

sessionRouter.post('/:id/compact', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = sessionService.get(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  const messages = memoryService.getAllMessages(id);
  if (messages.length === 0) {
    return res.status(400).json({ success: false, error: 'No messages to compact' });
  }
  
  const tokensBefore = session.promptTokens + session.completionTokens;
  
  const result = await summarizerService.compact({
    sessionId: id,
  });
  
  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }
  
  const updatedSession = sessionService.get(id);
  
  res.json({
    success: true,
    data: {
      tokensBefore,
      tokensAfter: result.tokensAfter,
      summaryLength: result.summary.length,
      summary: result.summary,
      summaryMessageId: updatedSession?.summaryMessageId,
    },
  });
});

sessionRouter.get('/:id/stats', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = sessionService.get(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  const check = summarizerService.checkNeedsCompact(id);
  const stats = sessionService.getStats(id, check.threshold);
  const msgStats = memoryService.getSessionStats(id);
  
  res.json({
    success: true,
    data: {
      ...stats,
      messages: msgStats,
    },
  });
});