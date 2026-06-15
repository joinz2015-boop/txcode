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
  fs.mkdirSync(resolvePath(filePath), { recursive: true });
  res.json({ success: true });
}
