import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  try {
    const { action_type, name, prompt, auto_send = 0, sort_order = 0 } = req.body;
    if (!action_type || !name || !prompt) return res.status(400).json({ success: false, error: "缺少必填字段" });
    if (!["design", "code", "test"].includes(action_type)) return res.status(400).json({ success: false, error: "无效的 action_type" });
    const r = dbService.run("INSERT INTO custom_actions (action_type, name, prompt, auto_send, sort_order) VALUES (?, ?, ?, ?, ?)", [action_type, name, prompt, auto_send ? 1 : 0, sort_order]);
    const action = dbService.get("SELECT * FROM custom_actions WHERE id = ?", [r.lastInsertRowid]);
    res.json({ success: true, data: action });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
