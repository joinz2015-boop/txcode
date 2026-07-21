import { Request, Response } from 'express';
import { playwrightManager } from '../../../services/test/playwrightManager.js';

export async function POST(req: Request, res: Response) {
  const { sessionId, webContentsId } = req.body;
  if (!sessionId || webContentsId == null) {
    return res.status(400).json({ success: false, error: 'sessionId 和 webContentsId 必填' });
  }
  playwrightManager.registerSession(sessionId, Number(webContentsId));
  res.json({ success: true, message: '注册成功' });
}
