import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: Request, res: Response) {
  const { filePath, content } = req.body;
  if (!filePath || content === undefined) return res.status(400).json({ success: false, error: "filePath and content are required" });
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  res.json({ success: true });
}
