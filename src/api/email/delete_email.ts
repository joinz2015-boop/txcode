import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  dbService.run("DELETE FROM email_config WHERE id = ?", [id]);
  res.json({ success: true });
}
