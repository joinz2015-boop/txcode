import { Request, Response } from "express";
import { execSync } from "child_process";

export async function GET(req: Request, res: Response) {
  const projectPath = req.query.path as string || process.cwd();
  try {
    const output = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf-8" });
    res.json({ success: true, data: { output } });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
