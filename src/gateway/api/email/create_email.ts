import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request, res: Response) {
  const { name, host, port, user, password, secure, isDefault } = req.body;
  if (!name || !host || !user || !password) return res.status(400).json({ success: false, error: "Missing required fields" });
  const id = uuidv4();
  dbService.run("INSERT INTO email_config (id, name, host, port, user, password, secure, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [id, name, host, port || 465, user, password, secure ? 1 : 0, isDefault ? 1 : 0]);
  res.json({ success: true, data: { id } });
}
