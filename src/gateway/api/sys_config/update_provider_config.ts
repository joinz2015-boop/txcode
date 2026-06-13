import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function POST(req: Request, res: Response) {
  const { id, name, apiKey, baseUrl, enabled, isDefault } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (apiKey !== undefined) updateData.apiKey = apiKey;
  if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
  if (enabled !== undefined) updateData.enabled = enabled;
  if (isDefault !== undefined) updateData.isDefault = isDefault;
  configService.updateProvider(id, updateData);
  res.json({ success: true, message: "Provider updated" });
}
