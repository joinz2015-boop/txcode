import { Request, Response } from 'express';
import { pluginWebshellHostService } from '../../../services/pluginWebshellHost/pluginWebshellHostService.js';

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  const result = await pluginWebshellHostService.testConnection(id);
  res.json(result);
}
