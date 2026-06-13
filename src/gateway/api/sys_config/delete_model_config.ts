import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  configService.deleteModel(id);
  res.json({ success: true, message: "Model deleted" });
}
