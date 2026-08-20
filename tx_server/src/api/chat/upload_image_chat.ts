import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { projectService } from '../../../services/project/project.service.js';

function getProjectUploadsDir(): string {
  return path.join(projectService.getCurrentProjectPath(), '.txcode', 'uploads');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const date = new Date().toISOString().slice(0, 10);
      const dir = path.join(getProjectUploadsDir(), date);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadSingle = upload.single('file');

export async function POST(req: Request, res: Response) {
  uploadSingle(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: '未上传文件' });
    const filePath = req.file.path;
    const date = new Date().toISOString().slice(0, 10);
    const url = '/uploads/' + date + '/' + req.file.filename;
    res.json({ success: true, data: { filePath, url } });
  });
}
