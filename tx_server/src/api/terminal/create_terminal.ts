import { Request, Response } from "express";
import { terminalService } from "../../service/terminal/index.js";
import { projectService } from "../../service/project/project.service.js";

export async function POST(req: Request, res: Response) {
  try {
    const { cols, rows, cwd } = req.body;
    const effectiveCwd = cwd || projectService.getCurrentProjectPath();
    const session = await terminalService.createSession({ cols, rows, cwd: effectiveCwd });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
}
