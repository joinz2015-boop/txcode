import { Request, Response } from 'express';
import { txcodeHubService } from '../../../services/hub/txcode_hub.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const page_size = parseInt(req.query.page_size as string) || 20;
    const keyword = req.query.keyword as string | undefined;
    const category_id = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;

    const data = await txcodeHubService.fetchPublishedSkills({ page, page_size, keyword, category_id });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || 'Failed to fetch published skills' });
  }
}
