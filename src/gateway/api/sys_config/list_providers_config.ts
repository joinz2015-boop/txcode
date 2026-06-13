import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function GET(_req: Request, res: Response) {
  const providers = configService.getProviders();
  res.json({
    success: true,
    data: providers.map(p => ({ id: p.id, name: p.name, baseUrl: p.baseUrl, enabled: p.enabled, isDefault: p.isDefault })),
  });
}
