import { Request, Response } from "express";
import { gatewayRepository } from "../../../repository/gateway.repository.js";

export async function GET(_req: Request, res: Response) {
  const config = gatewayRepository.getWafConfig();
  res.json({ success: true, data: config });
}
