import { Request, Response } from "express";
import { specInjector } from "../../../modules/spec/index.js";
import { memoryService } from "../../../core/memory/index.js";

export async function GET(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) return res.status(400).json({ success: false, error: "sessionId 必填" });
  const messages = memoryService.getAllMessages(sessionId);
  const shouldInject = specInjector.shouldInject(messages.length);
  if (!shouldInject) return res.json({ success: true, data: { inject: false } });
  const injection = specInjector.buildSpecInjection();
  res.json({ success: true, data: { inject: true, injection } });
}

