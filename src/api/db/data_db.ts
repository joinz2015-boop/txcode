import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: "name 必填" });
  const limit = parseInt(req.query.limit as string) || 100;
  const data = dbService.all(`SELECT * FROM "${name}" LIMIT ?`, [limit]);
  res.json({ success: true, data });
}
