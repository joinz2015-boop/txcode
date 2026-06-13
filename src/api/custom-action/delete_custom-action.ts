import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "id 必填" });
    const existing = dbService.get("SELECT * FROM custom_actions WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, error: "记录不存在" });
    dbService.run("DELETE FROM custom_actions WHERE id = ?", [id]);
    res.json({ success: true, data: existing });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
