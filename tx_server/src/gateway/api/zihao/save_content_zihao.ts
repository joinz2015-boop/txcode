import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { path: remotePath, content } = req.body;
    if (!remotePath || content === undefined) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    await zihaoService.saveContent(remotePath, content);
    res.json({ success: true, message: '保存成功' });
  } catch (error: unknown) {
    console.error('[save_content_zihao] 保存内容失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
