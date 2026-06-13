import { Request, Response } from "express";

export async function POST(req: Request, res: Response) {
  res.json({ success: true, message: "validation not implemented" });
}
