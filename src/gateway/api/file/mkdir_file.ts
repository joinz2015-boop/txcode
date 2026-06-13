import { Request, Response } from "express";
import * as fs from "fs";

export async function POST(req: Request, res: Response) {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ success: false, error: "filePath 必填" });
  fs.mkdirSync(filePath, { recursive: true });
  res.json({ success: true });
}
