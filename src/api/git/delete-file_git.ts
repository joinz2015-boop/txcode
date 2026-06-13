import { Request, Response } from "express";
import { execSync } from "child_process";
import * as fs from "fs";

export async function POST(req: Request, res: Response) {
  const { file, path: projectPath } = req.body;
  if (!file) return res.status(400).json({ success: false, error: "file 必填" });
  try {
    const cwd = projectPath || process.cwd();
    execSync(`git rm -f "${file}"`, { cwd });
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
