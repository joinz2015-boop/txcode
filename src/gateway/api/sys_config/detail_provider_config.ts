import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function GET(req: Request, res: Response) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const provider = configService.getProvider(id);
  if (!provider) return res.status(404).json({ success: false, error: "Provider not found" });
  res.json({ success: true, data: { id: provider.id, name: provider.name, apiKey: provider.apiKey, baseUrl: provider.baseUrl, enabled: provider.enabled, isDefault: provider.isDefault } });
}
