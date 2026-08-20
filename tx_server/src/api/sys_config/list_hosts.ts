import { Request, Response } from "express";
import { configService } from "../../service/config/index.js";

export async function GET(req: Request, res: Response) {
  const hosts = configService.getHosts();
  res.json({ success: true, data: hosts });
}
