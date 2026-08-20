import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { projectService } from "../../../services/project/project.service.js";

export async function GET(req: Request, res: Response) {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ success: false, error: "path 必填" });

  if (filePath.includes("..") || filePath.includes("~")) {
    return res.status(400).json({ success: false, error: "非法路径" });
  }
  if (!filePath.endsWith(".html")) {
    return res.status(400).json({ success: false, error: "只允许 HTML 文件" });
  }

  const projectPath = projectService.getCurrentProjectPath();
  const fullPath = path.join(projectPath, ".txcode", "design", filePath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send("File not found");
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(content);
}
