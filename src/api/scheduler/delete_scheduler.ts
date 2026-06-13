import { Request, Response } from "express";
import { schedulerService } from "../../modules/scheduler/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  if (!schedulerService.getTask(id)) return res.status(404).json({ success: false, error: "Task not found" });
  schedulerService.deleteTask(id);
  res.json({ success: true });
}
