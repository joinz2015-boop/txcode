import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function POST(req: Request, res: Response) {
  const { name, apiKey, baseUrl, enabled } = req.body;
  if (!name || !apiKey) return res.status(400).json({ success: false, error: "name and apiKey are required" });
  const id = configService.addProvider({ name, apiKey, baseUrl: baseUrl || "https://api.openai.com/v1", enabled: enabled !== false, isDefault: false });
  res.status(201).json({ success: true, data: { id } });
}
