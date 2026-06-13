import { Request, Response } from "express";
import { schedulerService } from "../../../modules/scheduler/index.js";

export async function POST(req: Request, res: Response) {
  try {
    const { name, scheduleType, model, skills, content, notifyType, enabled } = req.body || {};
    if (!name?.trim() || !scheduleType || !model || !content?.trim() || !notifyType) {
      return res.status(400).json({ success: false, error: "Missing required fields: name, scheduleType, model, content, notifyType" });
    }
    const id = schedulerService.createTask({ name: name.trim(), scheduleType, model, skills: skills || [], content: content.trim(), notifyType, enabled: enabled !== false });
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
}
