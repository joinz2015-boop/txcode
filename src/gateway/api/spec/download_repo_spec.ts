import { Request, Response } from "express";
import { specRepositoryService } from "../../../modules/spec/index.js";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const { id, specName, projectPath: bodyProjectPath } = req.body;
  if (!id || !specName) return res.status(400).json({ success: false, error: "id and specName are required" });
  const projectPath = bodyProjectPath || projectService.getCurrentProjectPath();
  const success = await specRepositoryService.downloadSpec(id, specName, projectPath);
  if (!success) return res.status(500).json({ success: false, error: "Download failed" });
  res.json({ success: true, data: { projectPath } });
}

