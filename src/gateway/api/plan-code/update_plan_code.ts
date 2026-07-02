import { Request, Response } from 'express';
import { planCodeService } from '../../../services/plan-code/planCode.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ success: false, error: 'oldName 和 newName 必填' });
    }
    const session = planCodeService.update(oldName, newName);
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
