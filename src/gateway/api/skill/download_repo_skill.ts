import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../services/skill/index.js';
import { sessionService } from '../../../services/session/index.js';
import { projectService } from '../../../services/project/project.service.js';

export async function POST(req: Request, res: Response) {
  const repoId = req.body.repoId || req.body.id;
  const projectPath = req.body.projectPath || projectService.getCurrentProjectPath();

  if (!repoId) return res.status(400).json({ success: false, error: 'repoId is required' });

  if (req.body.all) {
    const result = await skillRepositoryService.downloadAll(repoId, projectPath);
    return res.json({ success: result.success, data: { ...result, projectPath } });
  }

  const skillName = req.body.skillName;
  if (!skillName) return res.status(400).json({ success: false, error: 'skillName is required when all is not set' });
  const success = await skillRepositoryService.downloadSkill(repoId, skillName, projectPath);
  if (!success) return res.status(500).json({ success: false, error: 'Download failed' });
  res.json({ success: true, data: { projectPath } });
}
