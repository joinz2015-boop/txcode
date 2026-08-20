import { Request, Response } from 'express';
import { songbingService } from '../../../services/songbing/songbing.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { platformUrl } = req.body;
    const data = songbingService.saveConfig({ platformUrl });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
