import { Request, Response } from "express";
import * as fs from "fs";

export async function POST(req: Request, res: Response) {
  const { filePath, oldString, newString } = req.body;
  if (!filePath || oldString === undefined || newString === undefined) return res.status(400).json({ success: false, error: "filePath, oldString, newString are required" });
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "File not found" });
  let content = fs.readFileSync(filePath, "utf-8");
  if (!content.includes(oldString)) return res.status(400).json({ success: false, error: "oldString not found" });
  content = content.replace(oldString, newString);
  fs.writeFileSync(filePath, content, "utf-8");
  res.json({ success: true });
}
