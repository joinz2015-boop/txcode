import { Request, Response } from "express";
import * as child_process from "child_process";
import * as fs from "fs";
import * as os from "os";

export async function GET(_req: Request, res: Response) {
  try {
    const platform = os.platform();
    if (platform === "win32") {
      const drives = getWindowsDrives();
      res.json({ success: true, data: { items: drives } });
    } else {
      res.json({ success: true, data: { items: [{ name: "/", path: "/" }] } });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "获取盘符失败" });
  }
}

function getWindowsDrives(): { name: string; path: string }[] {
  const drives: { name: string; path: string }[] = [];
  try {
    const result = child_process.execSync("wmic logicaldisk get name", { encoding: "utf8", timeout: 5000 });
    const lines = result.split("\n").slice(1);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed !== "Name" && trimmed.match(/^[A-Za-z]:$/)) {
        const drivePath = trimmed + "\\";
        if (fs.existsSync(drivePath)) {
          drives.push({ name: trimmed, path: drivePath });
        }
      }
    }
  } catch {
    // wmic 不可用时回退到遍历字母
    for (let letter = 65; letter <= 90; letter++) {
      const drivePath = String.fromCharCode(letter) + ":\\";
      if (fs.existsSync(drivePath)) {
        drives.push({ name: String.fromCharCode(letter) + ":", path: drivePath });
      }
    }
  }
  return drives;
}
