import { Request, Response } from "express";
import { terminalService } from "../../../modules/terminal/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  if (!terminalService.isSessionAlive(id)) return res.status(404).json({ success: false, error: "Terminal session not found" });
  terminalService.deleteSession(id);
  res.json({ success: true });
}
