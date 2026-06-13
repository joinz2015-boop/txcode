import { Request, Response } from "express";
import { gatewayRepository } from "../../../repository/gateway.repository.js";

export async function POST(req: Request, res: Response) {
  const { enabled, rules } = req.body;
  gatewayRepository.upsertConfig("waf", { enabled, rules });
  res.json({ success: true });
}
