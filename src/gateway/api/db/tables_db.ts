import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";

export async function GET(_req: Request, res: Response) {
  const tables = dbService.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", []);
  res.json({ success: true, data: tables });
}
