import { Request, Response } from 'express';
import { pluginWebshellHostService } from '../../../services/pluginWebshellHost/pluginWebshellHostService.js';

export async function POST(req: Request, res: Response) {
  const { name, host, port, username, password } = req.body;
  if (!name || !host || !username || !password) {
    return res.status(400).json({ success: false, error: 'name, host, username, password 必填' });
  }
  const result = pluginWebshellHostService.create({ name, host, port, username, password });
  res.status(201).json({ success: true, data: result });
}
