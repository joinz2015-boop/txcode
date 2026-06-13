import { Request, Response } from "express";
import { gatewayRepository } from "../../../repository/gateway.repository.js";

export async function GET(_req: Request, res: Response) {
  const config = gatewayRepository.getConfig("dingtalk");
  res.json({ success: true, data: config });
}

export async function POST(req: Request, res: Response) {
  const { appKey, appSecret } = req.body;
  gatewayRepository.upsertConfig("dingtalk", { appKey, appSecret });
  res.json({ success: true });
}
