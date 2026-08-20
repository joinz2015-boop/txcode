import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";

const CHUNKS_BASE = path.join(os.homedir(), ".txcode", "uploads", "chunks");

export async function POST(req: Request, res: Response) {
  const { uploadId } = req.body;
  if (!uploadId) {
    return res.status(400).json({ success: false, error: "缺少 uploadId" });
  }

  const chunkDir = path.join(CHUNKS_BASE, uploadId);
  const metaFile = path.join(chunkDir, "meta.json");

  if (!fs.existsSync(metaFile)) {
    return res.status(400).json({ success: false, error: "上传会话不存在" });
  }

  const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  const { fileName, targetDir, totalChunks } = meta;

  for (let i = 0; i < totalChunks; i++) {
    if (!fs.existsSync(path.join(chunkDir, `chunk_${i}`))) {
      return res.status(400).json({ success: false, error: `缺少分片 chunk_${i}` });
    }
  }

  const destPath = path.join(targetDir, fileName);
  const destDir = path.dirname(destPath);
  fs.mkdirSync(destDir, { recursive: true });

  const writeStream = fs.createWriteStream(destPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `chunk_${i}`);
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
  }

  writeStream.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  fs.rmSync(chunkDir, { recursive: true, force: true });

  res.json({ success: true, data: { destPath } });
}
