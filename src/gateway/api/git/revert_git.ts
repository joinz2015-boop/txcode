import { Request, Response } from "express";
import { execSync } from "child_process";

export async function POST(req: Request, res: Response) {
  const { file, path: projectPath } = req.body;
  if (!file) return res.status(400).json({ success: false, error: "file 必填" });
  try {
    execSync(`git checkout -- "${file}"`, { cwd: projectPath || process.cwd() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
