import { Request, Response } from "express";

export async function GET(_req: Request, res: Response) {
  res.json({ success: true, data: { ptyAvailable: false, message: "Using basic shell spawn" } });
}
