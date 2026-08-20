import { Request, Response } from 'express';
import { songbingService } from '../../service/songbing/songbing.service.js';

export async function GET(_req: Request, res: Response) {
  const data = songbingService.getConfig();
  res.json({ success: true, data });
}
