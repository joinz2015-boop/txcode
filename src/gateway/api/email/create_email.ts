import { Request, Response } from "express";
import { emailRepository } from "../../../repository/email.repository.js";

export async function POST(req: Request, res: Response) {
  const { name, host, port, user, password, secure, isDefault } = req.body;
  if (!name || !host || !user || !password) return res.status(400).json({ success: false, error: "Missing required fields" });
  const id = emailRepository.create({ name, host, port: port || 465, secure: secure ? 1 : 0, user, password, is_default: isDefault ? 1 : 0 });
  res.json({ success: true, data: { id } });
}
