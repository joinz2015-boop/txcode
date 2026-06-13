import { Request, Response } from 'express';
import { sessionService } from '../../../services/session/index.js';

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  sessionService.delete(id);
  res.json({ success: true });
}
