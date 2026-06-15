import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

export async function GET(req: Request, res: Response) {
  const dirPath = req.query.path as string || projectService.getCurrentProjectPath();
  if (!fs.existsSync(dirPath)) return res.status(404).json({ success: false, error: "Path not found" });
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const items = entries.map(e => ({ name: e.name, is_directory: e.isDirectory(), path: path.join(dirPath, e.name) }));
  res.json({ success: true, data: { current_path: dirPath, parent_path: path.dirname(dirPath), items } });
}
