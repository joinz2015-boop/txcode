import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function GET(req: Request, res: Response) {
  const key = req.query.key as string;
  if (!key) return res.status(400).json({ success: false, error: "key 必填" });
  const value = configService.get(key);
  res.json({ success: true, data: { key, value } });
}
