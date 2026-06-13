import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../services/skill/index.js';

export async function POST(req: Request, res: Response) {
  const id = req.body.id as string;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  const { name, url, type, repo_path } = req.body;
  const success = skillRepositoryService.updateRepository(id, { name, url, type, repo_path });
  if (!success) return res.status(404).json({ success: false, error: 'Repository not found' });
  res.json({ success: true });
}
