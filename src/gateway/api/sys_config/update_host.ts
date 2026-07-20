import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function POST(req: Request, res: Response) {
  const { id, name, ip, port } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  try {
    configService.updateHost(id, { name, ip, port });
    res.json({ success: true, message: "主机更新成功" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
