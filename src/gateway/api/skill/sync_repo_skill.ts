import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../services/skill/index.js';

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  const result = await skillRepositoryService.syncRepository(id);
  res.json(result);
}
