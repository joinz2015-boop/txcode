import { Request, Response } from "express";
import { execSync } from "child_process";

export async function POST(req: Request, res: Response) {
  const { path: projectPath } = req.body;
  try {
    execSync("git checkout -- .", { cwd: projectPath || process.cwd() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
