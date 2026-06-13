import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  const { enabled, rules } = req.body;
  dbService.run("INSERT OR REPLACE INTO gateway_config (type, config) VALUES (?, ?)", ["waf", JSON.stringify({ enabled, rules })]);
  res.json({ success: true });
}
