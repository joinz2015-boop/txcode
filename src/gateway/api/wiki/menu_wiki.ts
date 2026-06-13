import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

export async function GET(_req: Request, res: Response) {
  const wikiDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(wikiDir)) return res.json({ success: true, data: [] });
  const items = fs.readdirSync(wikiDir).filter(f => f.endsWith(".md")).map(f => f.replace(".md", ""));
  res.json({ success: true, data: items });
}
