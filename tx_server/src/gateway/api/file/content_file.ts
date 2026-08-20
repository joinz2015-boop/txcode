import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

function resolvePath(input: string): string {
  if (path.isAbsolute(input)) return input;
  return path.resolve(projectService.getCurrentProjectPath(), input);
}

export async function GET(req: Request, res: Response) {
  const filePath = resolvePath(req.query.path as string);
  if (!filePath) return res.status(400).json({ success: false, error: "path 必填" });
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "File not found" });
  const content = fs.readFileSync(filePath, "utf-8");
  res.json({ success: true, data: { content, path: filePath } });
}
