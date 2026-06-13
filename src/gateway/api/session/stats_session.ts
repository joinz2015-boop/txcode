import { Request, Response } from 'express';
import { sessionService } from '../../../services/session/index.js';
import { memoryService } from '../../../core/memory/index.js';

export async function GET(req: Request, res: Response) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  const threshold = Number(req.query.threshold) || 100000;
  const stats = sessionService.getStats(id, threshold);
  const msgStats = memoryService.getSessionStats(id);
  res.json({ success: true, data: { ...stats, messages: msgStats } });
}
