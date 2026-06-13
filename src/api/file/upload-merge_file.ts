import { Request, Response } from "express";

export async function POST(req: Request, res: Response) {
  res.json({ success: true, message: "merge upload not implemented" });
}
