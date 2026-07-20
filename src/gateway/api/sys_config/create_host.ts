import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function POST(req: Request, res: Response) {
  const { name, ip, port } = req.body;
  if (!name || !ip) return res.status(400).json({ success: false, error: "name 和 ip 必填" });
  try {
    const host = configService.createHost({ name, ip, port: port || 40000 });
    res.json({ success: true, data: host });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
