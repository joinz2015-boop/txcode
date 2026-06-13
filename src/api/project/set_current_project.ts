import { Request, Response } from "express";
import { projectService } from "../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  projectService.setCurrentProject(id);
  res.json({ success: true, data: projectService.getCurrentProject() });
}
