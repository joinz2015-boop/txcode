import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function GET(_req: Request, res: Response) {
  const proxyConfig = configService.getProxyConfig();
  res.json({ success: true, data: proxyConfig });
}

export async function POST(req: Request, res: Response) {
  const { enabled, type, host, port } = req.body;
  configService.updateProxyConfig({ enabled, type, host, port });
  res.json({ success: true, message: "Proxy config updated" });
}
