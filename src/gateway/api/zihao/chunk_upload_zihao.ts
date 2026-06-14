import { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(os.tmpdir(), 'txcode-zihao-chunks');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

export async function POST(req: Request, res: Response) {
  chunkUpload.single('chunk')(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { chunkIndex, totalChunks, fileName, targetDir } = req.body;
      const file = req.file;

      if (!file || !fileName) {
        return res.status(400).json({ success: false, error: '参数不完整' });
      }

      const chunkBuffer = fs.readFileSync(file.path);

      try {
        const result = await zihaoService.chunkUpload(
          targetDir || '/',
          fileName,
          parseInt(chunkIndex as string, 10),
          parseInt(totalChunks as string, 10),
          chunkBuffer
        );

        if (result.file) {
          res.json({ success: true, data: result.file });
        } else {
          res.json({ success: true, data: { status: 'uploading', progress: result.progress, total: result.total } });
        }
      } finally {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (error: unknown) {
      console.error('[chunk_upload_zihao] 上传失败:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}
