import { Request, Response } from "express";
import { specManager } from "../../modules/spec/index.js";
import { projectService } from "../../services/project/project.service.js";

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: "name 必填" });
  specManager.setProjectPath(projectService.getCurrentProjectPath());
  const content = specManager.getSpecContent(name);
  if (content === null) return res.status(404).json({ success: false, error: "Spec not found" });
  res.json({ success: true, data: content });
}

