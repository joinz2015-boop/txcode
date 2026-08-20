import { Request, Response } from "express";

export async function POST(req: Request, res: Response) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: "url 必填" });
  res.json({ success: true, data: { message: "download from url not implemented yet" } });
}
