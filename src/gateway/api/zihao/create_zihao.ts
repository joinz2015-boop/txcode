import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { name, path: parentPath, type } = req.body;
    if (!name || !parentPath || !type) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const result = await zihaoService.create(name, parentPath, type);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[create_zihao] 创建失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
