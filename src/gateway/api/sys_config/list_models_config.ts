import { Request, Response } from "express";
import { configService } from "../../../core/config/index.js";

export async function GET(req: Request, res: Response) {
  const providerId = req.query.providerId as string;
  const models = providerId ? configService.getModels(providerId) : configService.getAllModels();
  res.json({ success: true, data: models });
}
