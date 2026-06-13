import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function POST(req: Request, res: Response) {
  const { id, name, enabled } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (enabled !== undefined) updateData.enabled = enabled;
  configService.updateModel(id, updateData);
  res.json({ success: true, message: "Model updated" });
}
