import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";

const uploadDir = path.join(os.homedir(), ".txcode", "uploads");
const upload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => { const dir = path.join(uploadDir, new Date().toISOString().slice(0, 10)); fs.mkdirSync(dir, { recursive: true }); cb(null, dir); },
  filename: (_req, file, cb) => { const ext = path.extname(file.originalname); cb(null, crypto.randomUUID() + ext); }
}), limits: { fileSize: 100 * 1024 * 1024 } });
const up = upload.single("file");

export async function POST(req: Request, res: Response) {
  up(req, res, (err: any) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: "未上传文件" });
    res.json({ success: true, data: { filePath: req.file.path, url: "/uploads/" + new Date().toISOString().slice(0, 10) + "/" + req.file.filename } });
  });
}
