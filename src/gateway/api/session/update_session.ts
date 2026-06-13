import { Request, Response } from 'express';
import { sessionService } from '../../../services/session/index.js';

export async function POST(req: Request, res: Response) {
  const { id, title, projectPath } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  sessionService.update(id, { title, projectPath });
  const session = sessionService.get(id);
  res.json({ success: true, data: session });
}
