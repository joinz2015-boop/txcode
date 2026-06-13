import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../modules/skill/index.js';

export async function POST(req: Request, res: Response) {
  const { name, url, type, repo_path } = req.body;
  if (!name || !url) return res.status(400).json({ success: false, error: 'name and url are required' });
  const repo = skillRepositoryService.createRepository({ name, url, type, repo_path });
  res.json({ success: true, data: repo });
}
