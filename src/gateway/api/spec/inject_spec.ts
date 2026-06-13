import { Request, Response } from "express";
import { specInjector } from "../../../modules/spec/index.js";
import { memoryService } from "../../../services/memory/index.js";

export async function POST(req: Request, res: Response) {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ success: false, error: "message is required" });
  if (!specInjector.shouldInject(sessionId ? memoryService.getAllMessages(sessionId).length : 0)) {
    return res.json({ success: true, data: { message } });
  }
  const injectedMessage = specInjector.injectIntoMessage(message);
  res.json({ success: true, data: { message: injectedMessage } });
}

