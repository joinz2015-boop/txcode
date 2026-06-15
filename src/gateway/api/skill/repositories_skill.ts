import { Request, Response } from 'express';
import { skillRepositoryService } from '../../../services/skill/index.js';

export async function GET(req: Request, res: Response) {
  const repoId = req.query.repoId as string | undefined;

  if (repoId) {
    const skills = skillRepositoryService.getRemoteSkills(repoId);
    res.json({ success: true, data: skills });
    return;
  }

  const repos = skillRepositoryService.getAllRepositories();
  res.json({
    success: true,
    data: repos.map(repo => ({ ...repo, isSynced: skillRepositoryService.isSynced(repo.id) })),
  });
}
