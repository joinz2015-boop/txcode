import { Request, Response } from "express";
import { customActionRepository } from "../../../repository/custom_action.repository.js";

export async function POST(req: Request, res: Response) {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "id 必填" });
    const existing = customActionRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: "记录不存在" });
    customActionRepository.delete(id);
    res.json({ success: true, data: existing });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
