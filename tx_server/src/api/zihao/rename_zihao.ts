import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { oldPath, newName } = req.body;
    if (!oldPath || !newName) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const result = await zihaoService.rename(oldPath, newName);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[rename_zihao] 重命名失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
