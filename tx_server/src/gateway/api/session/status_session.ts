import { Request, Response } from 'express';
import { sessionService } from '../../../services/session/index.js';

export async function POST(req: Request, res: Response) {
  const { sessionIds } = req.body as { sessionIds?: string[] };
  if (!sessionIds || !Array.isArray(sessionIds)) return res.status(400).json({ success: false, error: 'sessionIds array required' });
  const statuses = sessionIds.map(id => {
    const session = sessionService.get(id);
    return { sessionId: id, status: session?.status || 'idle' };
  });
  res.json({ success: true, data: statuses });
}
