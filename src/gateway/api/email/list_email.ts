import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";

export async function GET(_req: Request, res: Response) {
  const configs = dbService.all("SELECT * FROM email_config ORDER BY created_at DESC", []);
  res.json({ success: true, data: configs.map((c: any) => ({ ...c, password: "" })) });
}
