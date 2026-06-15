import { Request, Response } from "express";
import { execSync } from "child_process";
import { projectService } from "../../../services/project/project.service.js";

export async function GET(req: Request, res: Response) {
  const projectPath = req.query.path as string || projectService.getCurrentProjectPath();
  try {
    execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "ignore" });
    const gitRoot = execSync("git rev-parse --show-toplevel", { cwd: projectPath, encoding: "utf-8" }).trim();
    res.json({ success: true, data: { isRepo: true, gitRoot } });
  } catch { res.json({ success: true, data: { isRepo: false, gitRoot: null } }); }
}
