import { Request, Response } from "express";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { file, path: _path } = req.body;
  if (!file) return res.status(400).json({ success: false, error: "file 必填" });
  try {
    const cwd = _path || projectService.getCurrentProjectPath();
    const fullPath = path.join(cwd, file);
    let tracked = true;
    try {
      execSync(`git ls-files --error-unmatch "${file}"`, { cwd, stdio: "ignore" });
    } catch {
      tracked = false;
    }
    if (tracked) {
      execSync(`git rm -f "${file}"`, { cwd });
    }
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
