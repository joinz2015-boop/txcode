import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../modules/skill/index.js';
import { sessionService } from '../../../modules/session/index.js';
import { projectService } from '../../../services/project/project.service.js';

export async function POST(req: Request, res: Response) {
  const { id, skillName, projectPath: bodyProjectPath } = req.body;
  if (!id || !skillName) return res.status(400).json({ success: false, error: 'id and skillName are required' });
  const projectPath = bodyProjectPath || projectService.getCurrentProjectPath();
  const success = await skillRepositoryService.downloadSkill(id, skillName, projectPath);
  if (!success) return res.status(500).json({ success: false, error: 'Download failed' });
  res.json({ success: true, data: { projectPath } });
}
