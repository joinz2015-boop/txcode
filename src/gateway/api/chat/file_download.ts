import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, res: Response) {
  const filePath = req.query.filePath as string;
  if (!filePath) return res.status(400).json({ success: false, error: 'filePath 必填' });

  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      return res.status(404).json({ success: false, error: '不是文件' });
    }

    const ext = path.extname(resolved).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = fs.createReadStream(resolved);
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
