import { Request, Response } from 'express';
import { planCodeService } from '../../../services/plan-code/planCode.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const { folderName } = req.query;
    if (!folderName) {
      return res.status(400).json({ success: false, error: 'folderName 必填' });
    }
    const content = planCodeService.readPlan(folderName as string);
    res.json({ success: true, data: { content } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
