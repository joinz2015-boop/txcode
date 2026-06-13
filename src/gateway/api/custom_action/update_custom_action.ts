import { Request, Response } from "express";
import { customActionRepository } from "../../../repository/custom_action.repository.js";

export async function POST(req: Request, res: Response) {
  try {
    const { id, action_type, name, prompt, auto_send, sort_order } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "id 必填" });
    const existing = customActionRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: "记录不存在" });
    if (action_type !== undefined && !["design", "code", "test"].includes(action_type))
      return res.status(400).json({ success: false, error: "无效 action_type" });
    customActionRepository.update(id, { action_type, name, prompt, auto_send, sort_order });
    res.json({ success: true, data: customActionRepository.getById(id) });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
