import { Request, Response } from 'express';
import { songbingService } from '../../../services/songbing/songbing.service.js';

export async function POST(_req: Request, res: Response) {
  try {
    await songbingService.cancelAuth();
    res.json({ success: true, message: '已取消认证' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
