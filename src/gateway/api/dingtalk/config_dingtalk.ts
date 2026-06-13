import { Request, Response } from "express";
import { configRepository } from "../../../repository/config.repository.js";

export async function GET(_req: Request, res: Response) {
  const config = configRepository.getDingTalkConfig();
  res.json({ success: true, data: config });
}

export async function POST(req: Request, res: Response) {
  const { appKey, appSecret } = req.body;
  configRepository.updateDingTalkConfig({ clientId: appKey, clientSecret: appSecret });
  res.json({ success: true });
}
