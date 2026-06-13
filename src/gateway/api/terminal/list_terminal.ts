import { Request, Response } from "express";
import { terminalService } from "../../../modules/terminal/index.js";

export async function GET(_req: Request, res: Response) {
  const sessions = terminalService.getAllSessions();
  res.json({ success: true, data: sessions });
}
