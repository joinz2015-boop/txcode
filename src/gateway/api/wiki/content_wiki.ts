import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

export async function GET(req: Request, res: Response) {
  const wikiPath = req.query.path as string;
  if (!wikiPath) return res.status(400).json({ success: false, error: "path 必填" });
  const fullPath = path.join(process.cwd(), "docs", wikiPath + ".md");
  if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: "Wiki not found" });
  const content = fs.readFileSync(fullPath, "utf-8");
  res.json({ success: true, data: { content } });
}
