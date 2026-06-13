import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function POST(req: Request, res: Response) {
  try {
    const { id, action_type, name, prompt, auto_send, sort_order } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "id 必填" });
    const existing = dbService.get("SELECT * FROM custom_actions WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, error: "记录不存在" });
    const fields: string[] = []; const vals: (string | number)[] = [];
    if (action_type !== undefined) { if (!["design", "code", "test"].includes(action_type)) return res.status(400).json({ success: false, error: "无效 action_type" }); fields.push("action_type = ?"); vals.push(action_type); }
    if (name !== undefined) { fields.push("name = ?"); vals.push(name); }
    if (prompt !== undefined) { fields.push("prompt = ?"); vals.push(prompt); }
    if (auto_send !== undefined) { fields.push("auto_send = ?"); vals.push(auto_send ? 1 : 0); }
    if (sort_order !== undefined) { fields.push("sort_order = ?"); vals.push(sort_order); }
    if (fields.length === 0) return res.json({ success: true, data: existing });
    vals.push(id);
    dbService.run(`UPDATE custom_actions SET ${fields.join(", ")} WHERE id = ?`, vals);
    res.json({ success: true, data: dbService.get("SELECT * FROM custom_actions WHERE id = ?", [id]) });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
