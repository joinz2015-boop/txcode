/**
 * Session API 路由
 */

import { Router, Request, Response } from 'express';
import { sessionService } from '../modules/session/index.js';
import { ApiResponse, SessionCreateRequest } from './api.types.js';

export const sessionRouter = Router();

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