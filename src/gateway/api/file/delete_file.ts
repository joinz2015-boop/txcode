import { Request, Response } from "express";
import * as fs from "fs";

export async function POST(req: Request, res: Response) {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ success: false, error: "filePath 必填" });
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "Path not found" });
  if (fs.statSync(filePath).isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
  else fs.unlinkSync(filePath);
  res.json({ success: true });
}
