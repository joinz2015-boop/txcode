import { Request, Response } from "express";
import { projectService } from "../../../services/project/project.service.js";

export async function GET(_req: Request, res: Response) {
  const projects = projectService.getAllProjects();
  res.json({ success: true, data: projects });
}
