import { Request, Response } from 'express';
import { planCodeService } from '../../../services/plan-code/planCode.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { folderName } = req.body;
    if (!folderName) {
      return res.status(400).json({ success: false, error: 'folderName 必填' });
    }
    planCodeService.delete(folderName);
    res.json({ success: true, message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
