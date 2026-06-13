import { Request, Response } from "express";
import { schedulerService } from "../../modules/scheduler/index.js";

export async function POST(req: Request, res: Response) {
  try {
    const { id, name, scheduleType, model, skills, content, notifyType, enabled } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: "id 必填" });
    const existing = schedulerService.getTask(id);
    if (!existing) return res.status(404).json({ success: false, error: "Task not found" });
    schedulerService.updateTask(id, { name: name?.trim(), scheduleType, model, skills, content: content?.trim(), notifyType, enabled });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
}
