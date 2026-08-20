import { Request, Response } from "express";

export async function GET(_req: Request, res: Response) {
  res.json({ success: true, data: { running: false } });
}
