import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const homeDir = await zihaoService.getHomeDir();
    res.json({ success: true, data: { home_dir: homeDir } });
  } catch (error: unknown) {
    console.error('[home_dir_zihao] 获取主目录失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
