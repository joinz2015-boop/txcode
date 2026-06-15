import { Request, Response } from "express";
import { specRepositoryService } from "../../../modules/spec/index.js";
import { projectService } from "../../../services/project/project.service.js";

export async function POST(req: Request, res: Response) {
  const repoId = req.body.repoId || req.body.id;
  const projectPath = req.body.projectPath || projectService.getCurrentProjectPath();

  if (!repoId) return res.status(400).json({ success: false, error: "repoId is required" });

  if (req.body.all) {
    const result = await specRepositoryService.downloadAll(repoId, projectPath);
    return res.json({ success: result.success, data: { ...result, projectPath } });
  }

  const specName = req.body.specName;
  if (!specName) return res.status(400).json({ success: false, error: "specName is required when all is not set" });
  const success = await specRepositoryService.downloadSpec(repoId, specName, projectPath);
  if (!success) return res.status(500).json({ success: false, error: "Download failed" });
  res.json({ success: true, data: { projectPath } });
}

