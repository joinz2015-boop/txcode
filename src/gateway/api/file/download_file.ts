import { Request, Response } from "express";
import * as fs from "fs";

export async function GET(req: Request, res: Response) {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ success: false, error: "path 必填" });
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "File not found" });
  res.download(filePath);
}
