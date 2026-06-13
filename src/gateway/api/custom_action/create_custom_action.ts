import { Request, Response } from "express";
import { customActionRepository } from "../../../repository/custom_action.repository.js";

export async function POST(req: Request, res: Response) {
  try {
    const { action_type, name, prompt, auto_send = 0, sort_order = 0 } = req.body;
    if (!action_type || !name || !prompt) return res.status(400).json({ success: false, error: "缺少必填字段" });
    if (!["design", "code", "test"].includes(action_type)) return res.status(400).json({ success: false, error: "无效的 action_type" });
    const id = customActionRepository.create({ action_type, name, prompt, auto_send: !!auto_send, sort_order });
    const action = customActionRepository.getById(id);
    res.json({ success: true, data: action });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
