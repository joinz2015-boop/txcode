import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

export async function GET(req: Request, res: Response) {
  const dirPath = req.query.path as string || process.cwd();
  if (!fs.existsSync(dirPath)) return res.status(404).json({ success: false, error: "Path not found" });
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(dirPath, e.name) }));
  res.json({ success: true, data: files });
}
