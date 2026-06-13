import { Request, Response } from "express";

export async function POST(_req: Request, res: Response) {
  res.json({ success: true, message: "dingtalk gateway started" });
}
