import { Request, Response } from "express";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { diffLines } from "diff";
import { projectService } from "../../service/project/project.service.js";

interface DiffLine {
  num: number | null;
  type: "normal" | "removed" | "added" | "empty";
  content: string;
}

interface Hunk {
  id: number;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

const STATUS_MAP: Record<string, string> = {
  M: "modified",
  A: "added",
  D: "deleted",
  R: "renamed",
};

function runGit(projectPath: string, args: string[]): string {
  return execFileSync("git", args, { cwd: projectPath, encoding: "utf-8" });
}

function gitShow(projectPath: string, ref: string, file: string): string {
  try {
    return runGit(projectPath, ["show", `${ref}:${file}`]);
  } catch {
    return "";
  }
}

function readWorktree(projectPath: string, file: string): string {
  try {
    return fs.readFileSync(path.join(projectPath, file), "utf-8");
  } catch {
    return "";
  }
}

function getStatusDetail(projectPath: string, file: string): { code: string; status: string; untracked: boolean } {
  try {
    const out = runGit(projectPath, ["status", "--porcelain"]);
    for (const line of out.split("\n")) {
      if (!line.trim()) continue;
      let filePath = line.substring(3).trim();
      const arrowIdx = filePath.indexOf(" -> ");
      if (arrowIdx > 0) filePath = filePath.substring(arrowIdx + 4);
      if (filePath !== file) continue;
      const code = line.substring(0, 2);
      const untracked = code === "??";
      const indexCode = untracked ? "" : code[0];
      const status = untracked ? "untracked" : STATUS_MAP[indexCode] || "modified";
      return { code, status, untracked };
    }
  } catch {
    // ignore
  }
  return { code: "??", status: "untracked", untracked: true };
}

function isBinary(projectPath: string, file: string, staged: boolean, untracked: boolean): boolean {
  if (!untracked) {
    try {
      const args = staged ? ["diff", "--cached", "--numstat", "--", file] : ["diff", "--numstat", "--", file];
      const out = runGit(projectPath, args);
      if (out && out.startsWith("-\t-\t")) return true;
    } catch {
      // fallthrough to byte check
    }
  }
  try {
    const buf = fs.readFileSync(path.join(projectPath, file));
    return buf.includes(0);
  } catch {
    return false;
  }
}

function align(oldContent: string, newContent: string): { oldLines: DiffLine[]; newLines: DiffLine[] } {
  const oldLines: DiffLine[] = [];
  const newLines: DiffLine[] = [];
  let oldNum = 1;
  let newNum = 1;
  const parts = diffLines(oldContent, newContent);
  for (const part of parts) {
    const lines = part.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    if (part.removed) {
      for (const raw of lines) {
        const content = raw.replace(/\r$/, "");
        oldLines.push({ num: oldNum++, type: "removed", content });
        newLines.push({ num: null, type: "empty", content: "" });
      }
    } else if (part.added) {
      for (const raw of lines) {
        const content = raw.replace(/\r$/, "");
        oldLines.push({ num: null, type: "empty", content: "" });
        newLines.push({ num: newNum++, type: "added", content });
      }
    } else {
      for (const raw of lines) {
        const content = raw.replace(/\r$/, "");
        oldLines.push({ num: oldNum++, type: "normal", content });
        newLines.push({ num: newNum++, type: "normal", content });
      }
    }
  }
  return { oldLines, newLines };
}

function buildHunks(oldLines: DiffLine[], newLines: DiffLine[]): Hunk[] {
  const hunks: Hunk[] = [];
  let current: Hunk | null = null;
  const count = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < count; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    const isChange = (o && o.type === "removed") || (n && n.type === "added");
    if (isChange) {
      if (!current) {
        current = {
          id: hunks.length,
          oldStart: (o && o.num) || (n && n.num) || 1,
          newStart: (n && n.num) || (o && o.num) || 1,
          oldCount: 0,
          newCount: 0,
        };
      }
      if (o && o.type === "removed") current.oldCount++;
      if (n && n.type === "added") current.newCount++;
    } else if (current) {
      hunks.push(current);
      current = null;
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

export async function GET(req: Request, res: Response) {
  const file = req.query.file as string;
  const projectPath = (req.query.path as string) || projectService.getCurrentProjectPath();
  if (!file) {
    return res.status(400).json({ success: false, error: "file 必填" });
  }
  try {
    const detail = getStatusDetail(projectPath, file);
    let staged: boolean;
    if (req.query.staged === undefined) {
      staged = !detail.untracked && detail.code[0] !== " " && detail.code[0] !== "?";
    } else {
      staged = req.query.staged === "true";
    }

    let oldContent = "";
    let newContent = "";
    if (detail.untracked) {
      newContent = readWorktree(projectPath, file);
    } else if (staged) {
      oldContent = gitShow(projectPath, "HEAD", file);
      newContent = gitShow(projectPath, "", file);
    } else {
      oldContent = gitShow(projectPath, "", file);
      newContent = readWorktree(projectPath, file);
    }

    let headHash: string | null = null;
    try {
      headHash = runGit(projectPath, ["rev-parse", "--short", "HEAD"]).trim();
    } catch {
      headHash = null;
    }

    const binary = isBinary(projectPath, file, staged, detail.untracked);
    if (binary) {
      return res.json({
        success: true,
        data: {
          path: file,
          status: detail.status,
          staged,
          isNew: detail.untracked,
          oldLines: [],
          newLines: [],
          hunks: [],
          stats: { added: 0, removed: 0, totalOld: 0, totalNew: 0 },
          head: { hash: headHash },
          isBinary: true,
        },
      });
    }

    const { oldLines, newLines } = align(oldContent, newContent);
    const hunks = buildHunks(oldLines, newLines);
    const stats = {
      added: newLines.filter(l => l.type === "added").length,
      removed: oldLines.filter(l => l.type === "removed").length,
      totalOld: oldLines.filter(l => l.type !== "empty").length,
      totalNew: newLines.filter(l => l.type !== "empty").length,
    };
    const isNew = detail.untracked || (oldContent === "" && newContent !== "");

    res.json({
      success: true,
      data: {
        path: file,
        status: detail.status,
        staged,
        isNew,
        oldLines,
        newLines,
        hunks,
        stats,
        head: { hash: headHash },
        isBinary: false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
