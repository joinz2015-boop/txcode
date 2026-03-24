/**
 * LSP 进程启动工具
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";

export interface LaunchOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export function launchProcess(
  options: LaunchOptions
): { process: ChildProcess; cleanup: () => void } {
  const { command, args = [], cwd = process.cwd(), env = {} } = options;

  const mergedEnv = { ...process.env, ...env };

  let finalCommand = command;
  let finalArgs = args;

  if (process.platform === "win32") {
    const ext = path.extname(command).toLowerCase();
    if (ext === ".cmd" || ext === ".bat") {
      finalCommand = "cmd";
      finalArgs = ["/c", command, ...args];
    }
  }

  const proc = spawn(finalCommand, finalArgs, {
    cwd,
    env: mergedEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const cleanup = () => {
    if (!proc.killed) {
      proc.kill("SIGTERM");
    }
  };

  return { process: proc, cleanup };
}

export async function findRootDir(
  filePath: string,
  rootMarkers: string[]
): Promise<string | undefined> {
  let current = path.dirname(filePath);
  const root = path.parse(current).root;

  while (current !== root) {
    for (const marker of rootMarkers) {
      if (fs.existsSync(path.join(current, marker))) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  return undefined;
}

export function getSystemBinaryPath(binaryName: string): string | null {
  const PATH = process.env.PATH || process.env.Path || "";
  const pathSeparator = process.platform === "win32" ? ";" : ":";

  for (const dir of PATH.split(pathSeparator)) {
    if (process.platform === "win32") {
      const fullPathCmd = path.join(dir, binaryName + ".cmd");
      if (fs.existsSync(fullPathCmd)) {
        return fullPathCmd;
      }
      const fullPathBat = path.join(dir, binaryName + ".bat");
      if (fs.existsSync(fullPathBat)) {
        return fullPathBat;
      }
      const fullPathExe = path.join(dir, binaryName + ".exe");
      if (fs.existsSync(fullPathExe)) {
        return fullPathExe;
      }
    }
    const fullPath = path.join(dir, binaryName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}
