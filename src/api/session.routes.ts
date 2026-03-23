/**
 * Session API 路由
 */

import { Router, Request, Response } from 'express';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { configService } from '../modules/config/index.js';
import { SummarizerService } from '../modules/ai/summarizer/index.js';
import { ApiResponse, SessionCreateRequest } from './api.types.js';

export const sessionRouter = Router();
const summarizerService = new SummarizerService(sessionService, memoryService, configService);

sessionRouter.get('/', (req: Request, res: Response) => {
  const sessions = sessionService.getAll();
  res.json({ success: true, data: sessions });
});

sessionRouter.get('/current', (req: Request, res: Response) => {
  const session = sessionService.getCurrent();
  res.json({ success: true, data: session });
});

sessionRouter.post('/', (req: Request, res: Response) => {
  const { title, projectPath } = req.body as SessionCreateRequest;
  const session = sessionService.create(title, projectPath);
  res.status(201).json({ success: true, data: session });
});

sessionRouter.get('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = sessionService.get(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  res.json({ success: true, data: session });
});

sessionRouter.put('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { title, projectPath } = req.body;
  
  sessionService.update(id, { title, projectPath });
  const session = sessionService.get(id);
  res.json({ success: true, data: session });
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