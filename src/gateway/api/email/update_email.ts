import { Request, Response } from "express";
import { emailRepository } from "../../../repository/email.repository.js";

export async function POST(req: Request, res: Response) {
  const { id, name, host, port, user, password, secure, isDefault } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  emailRepository.update(Number(id), {
    name, host, port, user, password,
    secure: secure !== undefined ? (secure ? 1 : 0) : undefined,
    is_default: isDefault !== undefined ? (isDefault ? 1 : 0) : undefined,
  });
  res.json({ success: true });
}
