import { Request, Response } from "express";
import { specRepositoryService } from "../../modules/spec/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const success = specRepositoryService.deleteRepository(id);
  if (!success) return res.status(404).json({ success: false, error: "Repository not found" });
  res.json({ success: true });
}

