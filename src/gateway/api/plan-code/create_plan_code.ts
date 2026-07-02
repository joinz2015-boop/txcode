import { Request, Response } from 'express';
import { planCodeService } from '../../../services/plan-code/planCode.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { folderName } = req.body;
    if (!folderName) {
      return res.status(400).json({ success: false, error: 'folderName 必填' });
    }
    const session = planCodeService.create(folderName);
    res.status(201).json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
