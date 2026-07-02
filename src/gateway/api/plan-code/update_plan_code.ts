import { Request, Response } from 'express';
import { planCodeService } from '../../../services/plan-code/planCode.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { folderName, sessionName } = req.body;
    if (!folderName || !sessionName) {
      return res.status(400).json({ success: false, error: 'folderName 和 sessionName 必填' });
    }
    const session = planCodeService.renameSession(folderName, sessionName);
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
