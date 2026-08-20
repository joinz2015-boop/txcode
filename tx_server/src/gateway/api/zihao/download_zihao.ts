import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const remotePath = req.query.path as string;
    const localPath = req.query.localPath as string;

    if (!remotePath || !localPath) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const sendProgress = (progress: number) => {
      res.write(JSON.stringify({ progress }) + '\n');
    };

    sendProgress(0);
    await zihaoService.downloadStream(remotePath, localPath, sendProgress);
    res.write(JSON.stringify({ done: true }) + '\n');
    res.end();
  } catch (error: unknown) {
    console.error('[download_zihao] 下载失败:', error);
    res.write(JSON.stringify({ success: false, error: (error as Error).message }) + '\n');
    res.end();
  }
}
