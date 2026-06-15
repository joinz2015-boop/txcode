import { Request, Response } from "express";
import { execSync } from "child_process";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { path: _path } = req.body;
  try {
    execSync("git clean -fd", { cwd: _path || projectService.getCurrentProjectPath() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
