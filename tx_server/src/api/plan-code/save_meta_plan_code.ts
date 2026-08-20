import { Request, Response } from 'express';
import { planCodeService } from '../../../services/plan-code/planCode.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { folderName, meta } = req.body;
    if (!folderName || !meta) {
      return res.status(400).json({ success: false, error: 'folderName 和 meta 必填' });
    }
    planCodeService.saveMeta(folderName, meta);
    res.json({ success: true, message: '保存成功' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
