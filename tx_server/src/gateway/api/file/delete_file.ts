import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

function resolvePath(input: string): string {
  if (path.isAbsolute(input)) return input;
  return path.resolve(projectService.getCurrentProjectPath(), input);
}

export async function POST(req: Request, res: Response) {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ success: false, error: "filePath 必填" });
  const resolved = resolvePath(filePath);
  if (!fs.existsSync(resolved)) return res.status(404).json({ success: false, error: "Path not found" });
  if (fs.statSync(resolved).isDirectory()) fs.rmSync(resolved, { recursive: true, force: true });
  else fs.unlinkSync(resolved);
  res.json({ success: true });
}
