import { Request, Response } from "express";
import { execSync } from "child_process";

export async function GET(req: Request, res: Response) {
  const file = req.query.file as string;
  const projectPath = req.query.path as string || process.cwd();
  try {
    const args = file ? ["--", file] : [];
    const diff = execSync(`git diff ${args.join(" ")}`, { cwd: projectPath, encoding: "utf-8" });
    res.json({ success: true, data: { diff } });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
