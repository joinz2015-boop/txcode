import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

function resolvePath(input: string): string {
  if (path.isAbsolute(input)) return input;
  return path.resolve(projectService.getCurrentProjectPath(), input);
}

export async function POST(req: Request, res: Response) {
  const { filePath, content } = req.body;
  if (!filePath || content === undefined) return res.status(400).json({ success: false, error: "filePath and content are required" });
  const resolved = resolvePath(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, content, "utf-8");
  res.json({ success: true });
}
