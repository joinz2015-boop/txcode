import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function GET(_req: Request, res: Response) {
  const config = dbService.get("SELECT * FROM gateway_config WHERE type = ?", ["dingtalk"]);
  res.json({ success: true, data: config });
}
