import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

function resolvePath(input: string): string {
  if (!input) return projectService.getCurrentProjectPath();
  if (path.isAbsolute(input)) return input;
  return path.resolve(projectService.getCurrentProjectPath(), input);
}

function buildTree(dir: string, depth: number = 3): any[] {
  if (depth <= 0) return [];
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.slice(0, 100).map(e => {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) return { name: e.name, type: "directory", path: fp, children: buildTree(fp, depth - 1) };
    return { name: e.name, type: "file", path: fp };
  });
}

export async function GET(req: Request, res: Response) {
  const dirPath = resolvePath(req.query.path as string);
  const tree = buildTree(dirPath);
  res.json({ success: true, data: tree });
}
