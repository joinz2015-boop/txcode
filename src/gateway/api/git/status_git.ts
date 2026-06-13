import { Request, Response } from "express";
import { execSync } from "child_process";

interface GitChange {
  path: string;
  status: string;
  statusCode: string;
  isNew: boolean;
}

function parsePorcelain(output: string): GitChange[] {
  const STATUS_MAP: Record<string, { status: string; isNew: boolean }> = {
    " M": { status: "modified", isNew: false },
    "M ": { status: "modified", isNew: false },
    "MM": { status: "modified", isNew: false },
    " A": { status: "added", isNew: false },
    "A ": { status: "added", isNew: true },
    " D": { status: "deleted", isNew: false },
    "D ": { status: "deleted", isNew: false },
    " R": { status: "renamed", isNew: false },
    "R ": { status: "renamed", isNew: false },
    "??": { status: "untracked", isNew: true },
  };

  return output
    .split("\n")
    .filter(line => line.trim())
    .map(line => {
      const code = line.substring(0, 2);
      let filePath = line.substring(3).trim();
      const arrowIdx = filePath.indexOf(" -> ");
      if (arrowIdx > 0) {
        filePath = filePath.substring(arrowIdx + 4);
      }
      const info = STATUS_MAP[code] || { status: "modified", isNew: false };
      return { path: filePath, status: info.status, statusCode: code.trim(), isNew: info.isNew };
    });
}

export async function GET(req: Request, res: Response) {
  const projectPath = req.query.path as string || process.cwd();
  try {
    const raw = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf-8" });
    const changes = parsePorcelain(raw);
    res.json({ success: true, data: changes });
  } catch (error) { res.status(500).json({ success: false, error: String(error) }); }
}
