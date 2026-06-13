import { Request, Response } from "express";
import { emailRepository } from "../../../repository/email.repository.js";

export async function GET(_req: Request, res: Response) {
  const configs = emailRepository.findAll();
  res.json({ success: true, data: configs.map((c: any) => ({ ...c, password: "" })) });
}
