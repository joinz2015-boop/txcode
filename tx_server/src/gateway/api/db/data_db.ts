import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: "name 必填" });
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;
  const offset = (page - 1) * pageSize;
  const data = dbService.all(`SELECT * FROM "${name}" LIMIT ? OFFSET ?`, [pageSize, offset]);
  res.json({ success: true, data });
}
