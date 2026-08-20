import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

const CHUNKS_BASE = path.join(os.homedir(), ".txcode", "uploads", "chunks");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadId = (req as any).body?.uploadId || "unknown";
    const dir = path.join(CHUNKS_BASE, uploadId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = (req as any).body?.chunkIndex || "0";
    cb(null, `chunk_${chunkIndex}`);
  },
});

const up = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).single("chunk");

export async function POST(req: Request, res: Response) {
  up(req, res, (err: any) => {
    if (err) return res.status(400).json({ success: false, error: err.message });

    const { uploadId, chunkIndex, totalChunks, fileName, targetDir } = req.body;
    if (!uploadId || chunkIndex === undefined || !totalChunks || !fileName || !targetDir) {
      return res.status(400).json({ success: false, error: "缺少必需参数" });
    }

    const metaFile = path.join(CHUNKS_BASE, uploadId, "meta.json");
    if (!fs.existsSync(metaFile)) {
      fs.writeFileSync(metaFile, JSON.stringify({
        fileName: decodeURIComponent(fileName),
        targetDir,
        totalChunks: Number(totalChunks),
      }));
    }

    res.json({ success: true, data: { uploadId, chunkIndex: Number(chunkIndex) } });
  });
}
