import { Request, Response } from "express";
import { configService } from "../../core/config/index.js";

export async function POST(req: Request, res: Response) {
  const { providerId, name, enabled, contextWindow, maxOutputTokens, supportsVision, supportsTools } = req.body;
  if (!providerId || !name) return res.status(400).json({ success: false, error: "providerId and name are required" });
  const id = configService.addModel({ providerId, name, contextWindow: contextWindow || 4096, maxOutputTokens: maxOutputTokens || 4096, supportsVision: supportsVision || false, supportsTools: supportsTools !== false, enabled: enabled !== false });
  res.status(201).json({ success: true, data: { id } });
}
