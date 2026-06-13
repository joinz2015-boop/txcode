import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

export async function GET(req: Request, res: Response) {
  const assetPath = req.query.path as string;
  if (!assetPath) return res.status(400).json({ success: false, error: "path 必填" });
  const fullPath = path.join(process.cwd(), "docs", assetPath);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: "Asset not found" });
  res.sendFile(fullPath);
}
