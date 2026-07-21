import { Request, Response } from 'express';
import { pluginWebshellHostService } from '../../../services/pluginWebshellHost/pluginWebshellHostService.js';

export async function GET(_req: Request, res: Response) {
  const list = pluginWebshellHostService.getList();
  res.json({ success: true, data: list });
}
