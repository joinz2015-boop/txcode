import { Request, Response } from 'express';
import { sessionService } from '../../modules/session/index.js';
import { projectService } from '../../services/project/project.service.js';

export async function GET(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const projectPath = projectService.getCurrentProjectPath();
  const sessions = sessionService.getByProjectPath(projectPath, limit, offset);
  res.json({ success: true, data: sessions });
}
