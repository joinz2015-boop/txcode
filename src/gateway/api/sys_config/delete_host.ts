import { Request, Response } from "express";
import { configService } from "../../../services/config/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  try {
    configService.deleteHost(id);
    res.json({ success: true, message: "主机删除成功" });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
}
