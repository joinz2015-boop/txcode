import { Request, Response } from 'express';
import { txcodeHubService } from '../../../services/hub/txcode_hub.service.js';

export async function GET(_req: Request, res: Response) {
  try {
    const categories = await txcodeHubService.fetchSpecCategories();
    res.json({ success: true, data: categories });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || 'Failed to fetch spec categories' });
  }
}
