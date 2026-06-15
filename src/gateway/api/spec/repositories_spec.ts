import { Request, Response } from "express";
import { specRepositoryService } from "../../../modules/spec/index.js";

export async function GET(req: Request, res: Response) {
  const repoId = req.query.repoId as string | undefined;

  if (repoId) {
    const specs = await specRepositoryService.parseRepoSpecs(repoId);
    res.json({ success: true, data: specs });
    return;
  }

  const repos = specRepositoryService.getAllRepositories();
  res.json({
    success: true,
    data: repos.map(repo => ({ ...repo, isSynced: specRepositoryService.isSynced(repo.id) })),
  });
}

