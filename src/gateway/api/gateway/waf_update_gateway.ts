import { Request, Response } from "express";
import { gatewayRepository } from "../../../repository/gateway.repository.js";

export async function POST(req: Request, res: Response) {
  const { enabled, rules, secret_key, server_ip } = req.body;
  gatewayRepository.upsertWafConfig({ secret_key, server_ip });
  if (enabled !== undefined) {
    gatewayRepository.updateWafStatus(enabled ? 'running' : 'stopped');
  }
  res.json({ success: true });
}
