import { Request, Response } from 'express';
import { songbingService } from '../../../services/songbing/songbing.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'key 必填' });
    }
    const data = await songbingService.verifyAuth(key);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
