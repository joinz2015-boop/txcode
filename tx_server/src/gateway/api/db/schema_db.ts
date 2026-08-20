import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: "name 必填" });
  const columns = dbService.all(`PRAGMA table_info("${name}")`, []);
  const countRow = dbService.get(`SELECT COUNT(*) as count FROM "${name}"`, []) as { count: number } | undefined;
  const row_count = countRow ? countRow.count : 0;
  res.json({ success: true, data: { columns, row_count } });
}
