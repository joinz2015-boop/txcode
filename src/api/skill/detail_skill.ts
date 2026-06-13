import { Request, Response } from 'express';
import { skillsManager, skillHandler } from '../../modules/skill/index.js';
import { sessionService } from '../../modules/session/index.js';
import { projectService } from '../../services/project/project.service.js';

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: 'name 必填' });
  await skillsManager.loadAll();
  const result = await skillHandler({ name });
  if (!result.success) return res.status(404).json({ success: false, error: result.error });
  res.json({ success: true, data: result.data });
}
