import { Request, Response } from "express";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { name, path: projectPath } = req.body;
  if (!name || !projectPath) return res.status(400).json({ success: false, error: "name and path are required" });
  const project = projectService.createProject(name, projectPath);
  res.json({ success: true, data: project });
}
