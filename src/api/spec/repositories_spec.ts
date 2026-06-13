import { Request, Response } from "express";
import { specRepositoryService } from "../../modules/spec/index.js";

export async function GET(_req: Request, res: Response) {
  const repos = specRepositoryService.getAllRepositories();
  res.json({
    success: true,
    data: repos.map(repo => ({ ...repo, isSynced: specRepositoryService.isSynced(repo.id) })),
  });
}

