import { Request, Response } from "express";
import { specRepositoryService } from "../../../modules/spec/index.js";

export async function POST(req: Request, res: Response) {
  const repoId = req.body.repoId || req.body.id;
  if (!repoId) return res.status(400).json({ success: false, error: "id 必填" });
  const result = await specRepositoryService.syncRepository(repoId);
  res.json(result);
}

