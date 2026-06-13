import { Request, Response } from "express";
import { specManager } from "../../../modules/spec/index.js";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ success: false, error: "name and content are required" });
  specManager.setProjectPath(projectService.getCurrentProjectPath());
  const success = specManager.saveSpec(name, content);
  if (!success) return res.status(500).json({ success: false, error: "Failed to save spec" });
  res.json({ success: true });
}

