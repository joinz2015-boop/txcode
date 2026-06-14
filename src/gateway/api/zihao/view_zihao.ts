import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const remotePath = req.query.path as string;
    if (!remotePath) {
      return res.status(400).json({ success: false, error: 'path必填' });
    }
    const result = await zihaoService.viewFile(remotePath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[view_zihao] 查看文件失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
