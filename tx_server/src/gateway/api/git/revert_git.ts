import { Request, Response } from "express";
import { execSync } from "child_process";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { file, path: _path } = req.body;
  if (!file) return res.status(400).json({ success: false, error: "file 必填" });
  try {
    execSync(`git checkout -- "${file}"`, { cwd: _path || projectService.getCurrentProjectPath() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
