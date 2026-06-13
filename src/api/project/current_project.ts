import { Request, Response } from "express";
import { projectService } from "../../services/project/project.service.js";

export async function GET(_req: Request, res: Response) {
  const project = projectService.getCurrentProject();
  res.json({ success: true, data: project });
}
