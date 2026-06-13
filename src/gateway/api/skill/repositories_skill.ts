import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../services/skill/index.js';

export async function GET(_req: Request, res: Response) {
  const repos = skillRepositoryService.getAllRepositories();
  res.json({
    success: true,
    data: repos.map(repo => ({ ...repo, isSynced: skillRepositoryService.isSynced(repo.id) })),
  });
}
