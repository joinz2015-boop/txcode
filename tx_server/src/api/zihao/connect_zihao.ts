import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const result = await zihaoService.connect();
    res.json(result);
  } catch (error: unknown) {
    console.error('[connect_zihao] 连接失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
