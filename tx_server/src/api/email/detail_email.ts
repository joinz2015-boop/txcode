import { Request, Response } from "express";
import { emailRepository } from "../../../repository/email.repository.js";

export async function GET(req: Request, res: Response) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const config = emailRepository.findById(Number(id));
  if (!config) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data: { ...config, password: "" } });
}
