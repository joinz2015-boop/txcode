import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: "name 必填" });
  const schema = dbService.all("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", [name]);
  res.json({ success: true, data: schema });
}
