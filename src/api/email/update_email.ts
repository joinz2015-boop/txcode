import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  const { id, name, host, port, user, password, secure, isDefault } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const fields: string[] = [];
  const values: any[] = [];
  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (host !== undefined) { fields.push("host = ?"); values.push(host); }
  if (port !== undefined) { fields.push("port = ?"); values.push(port); }
  if (user !== undefined) { fields.push("\"user\" = ?"); values.push(user); }
  if (password !== undefined) { fields.push("password = ?"); values.push(password); }
  if (secure !== undefined) { fields.push("secure = ?"); values.push(secure ? 1 : 0); }
  if (isDefault !== undefined) { fields.push("is_default = ?"); values.push(isDefault ? 1 : 0); }
  if (fields.length === 0) return res.json({ success: true });
  values.push(id);
  dbService.run(`UPDATE email_config SET ${fields.join(", ")} WHERE id = ?`, values);
  res.json({ success: true });
}
