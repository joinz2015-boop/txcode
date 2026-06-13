import { Request, Response } from "express";
import { schedulerService } from "../../../modules/scheduler/index.js";

export async function GET(_req: Request, res: Response) {
  const tasks = schedulerService.getAllTasks();
  res.json({ success: true, data: tasks });
}
