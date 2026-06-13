import { Request, Response } from "express";
import * as fs from "fs";

export async function POST(req: Request, res: Response) {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) return res.status(400).json({ success: false, error: "oldPath and newPath are required" });
  if (!fs.existsSync(oldPath)) return res.status(404).json({ success: false, error: "Path not found" });
  fs.renameSync(oldPath, newPath);
  res.json({ success: true });
}
