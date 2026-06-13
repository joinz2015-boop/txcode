import { Request, Response } from "express";
import { schedulerService } from "../../../services/scheduler/scheduler.service.js";
import { taskLogService } from "../../../services/scheduler/task-log.service.js";

export async function GET(req: Request, res: Response) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  if (!schedulerService.getTask(id)) return res.status(404).json({ success: false, error: "Task not found" });
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = taskLogService.getLogsByTaskId(id, limit);
  res.json({ success: true, data: logs });
}
