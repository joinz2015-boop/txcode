import { Request, Response } from 'express';
import { songbingService } from '../../../services/songbing/songbing.service.js';

export async function POST(_req: Request, res: Response) {
  try {
    const data = await songbingService.syncModels();
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
