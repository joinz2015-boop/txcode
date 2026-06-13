import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function POST(req: Request, res: Response) {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ success: false, error: "key 必填" });
  configService.set(key, value);
  res.json({ success: true, message: "Config updated" });
}
