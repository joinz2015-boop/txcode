import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  const { appKey, appSecret } = req.body;
  dbService.run("INSERT OR REPLACE INTO gateway_config (type, config) VALUES (?, ?)", ["dingtalk", JSON.stringify({ appKey, appSecret })]);
  res.json({ success: true });
}
