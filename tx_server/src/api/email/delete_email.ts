import { Request, Response } from "express";
import { emailRepository } from "../../../repository/email.repository.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  emailRepository.delete(Number(id));
  res.json({ success: true });
}
