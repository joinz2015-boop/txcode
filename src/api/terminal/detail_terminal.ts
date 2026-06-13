import { Request, Response } from "express";
import { terminalService } from "../../modules/terminal/index.js";

export async function GET(req: Request, res: Response) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const session = terminalService.getSession(id);
  if (!session) return res.status(404).json({ success: false, error: "Terminal session not found" });
  res.json({ success: true, data: session });
}
