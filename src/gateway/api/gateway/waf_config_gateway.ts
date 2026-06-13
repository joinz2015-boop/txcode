import { Request, Response } from "express";
import { gatewayRepository } from "../../../repository/gateway.repository.js";

export async function GET(_req: Request, res: Response) {
  const config = gatewayRepository.getConfig("waf");
  res.json({ success: true, data: config });
}
