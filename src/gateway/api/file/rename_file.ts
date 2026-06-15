import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

function resolvePath(input: string): string {
  if (path.isAbsolute(input)) return input;
  return path.resolve(projectService.getCurrentProjectPath(), input);
}

export async function POST(req: Request, res: Response) {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) return res.status(400).json({ success: false, error: "oldPath and newPath are required" });
  const resolvedOld = resolvePath(oldPath);
  const resolvedNew = resolvePath(newPath);
  if (!fs.existsSync(resolvedOld)) return res.status(404).json({ success: false, error: "Path not found" });
  fs.renameSync(resolvedOld, resolvedNew);
  res.json({ success: true });
}
