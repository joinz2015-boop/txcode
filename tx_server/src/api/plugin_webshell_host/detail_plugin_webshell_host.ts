import { Request, Response } from 'express';
import { pluginWebshellHostService } from '../../../services/pluginWebshellHost/pluginWebshellHostService.js';

export async function GET(req: Request, res: Response) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  const detail = pluginWebshellHostService.getDetail(id as string);
  if (!detail) return res.status(404).json({ success: false, error: '主机不存在' });
  res.json({ success: true, data: detail });
}
