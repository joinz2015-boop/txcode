import { Request, Response } from 'express';
import { pluginWebshellHostService } from '../../../services/pluginWebshellHost/pluginWebshellHostService.js';

export async function POST(req: Request, res: Response) {
  const { id, name, host, port, username, password } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  try {
    pluginWebshellHostService.update(id, { name, host, port, username, password });
    res.json({ success: true, message: '更新成功' });
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message });
  }
}
