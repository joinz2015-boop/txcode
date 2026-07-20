import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function GET(req: Request, res: Response) {
  const ip = req.query.ip as string;
  const portStr = req.query.port as string;
  if (!ip || !portStr) return res.status(400).json({ success: false, error: "ip 和 port 必填" });
  const port = parseInt(portStr, 10);
  if (isNaN(port)) return res.status(400).json({ success: false, error: "port 必须为数字" });
  try {
    const reachable = await configService.testHost(ip, port);
    res.json({ success: true, data: { reachable } });
  } catch {
    res.json({ success: true, data: { reachable: false } });
  }
}
