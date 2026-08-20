import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { path: remotePath, type } = req.body;
    if (!remotePath || !type) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    await zihaoService.deleteFile(remotePath, type);
    res.json({ success: true, message: '删除成功' });
  } catch (error: unknown) {
    console.error('[delete_zihao] 删除失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
