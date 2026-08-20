import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const remotePath = req.query.path as string || '/';
    const result = await zihaoService.browse(remotePath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[browse_zihao] 浏览目录失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
