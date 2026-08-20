import { Request, Response } from 'express';
import { playwrightManager } from '../../../services/test/playwrightManager.js';

export async function POST(req: Request, res: Response) {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId 必填' });
  }
  playwrightManager.unregisterSession(sessionId);
  res.json({ success: true, message: '释放成功' });
}
