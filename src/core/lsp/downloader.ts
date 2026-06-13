/**
 * LSP 下载管理器
 */

import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import { getServer } from "./server.js";
import { LSPServerInfo } from "./types.js";

const TXCODE_BIN_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".txcode",
  "bin"
);

function getBinaryPath(serverId: string): string {
  return path.join(TXCODE_BIN_DIR, serverId);
}

async function needsDownload(serverId: string): Promise<boolean> {
  const server = getServer(serverId);
  if (!server) return false;

  if (server.requiresSystemBinary) return false;

  const binaryPath = getBinaryPath(serverId);
  return !fs.existsSync(binaryPath);
}

async function download(
  serverId: string,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  const server = getServer(serverId);
  if (!server) return false;

  if (!fs.existsSync(TXCODE_BIN_DIR)) {
    fs.mkdirSync(TXCODE_BIN_DIR, { recursive: true });
  }

  onProgress?.(0, `Starting download for ${server.name}...`);

  try {
    switch (server.downloadType) {
      case "npm":
        return await downloadNPM(server, onProgress);
      case "github":
        return await downloadGitHub(server, onProgress);
      case "go":
        return await downloadGo(server, onProgress);
      case "gem":
        return await downloadGem(server, onProgress);
      case "dotnet":
        return await downloadDotnet(server, onProgress);
      case "bun":
        return await downloadBun(server, onProgress);
      default:
        onProgress?.(100, `Unsupported download type for ${server.name}`);
        return false;
    }
  } catch (error) {
    onProgress?.(100, `Download failed: ${error}`);
    return false;
  }
}

async function downloadAll(
  serverIds: string[],
  onProgress?: (serverId: string, progress: number) => void
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (const serverId of serverIds) {
    const success = await download(serverId, (progress) => {
      onProgress?.(serverId, progress);
    });
    results.set(serverId, success);
  }

  return results;
}

function getDownloadURL(serverId: string): string | undefined {
  const server = getServer(serverId);
  return server?.downloadUrl;
}

function cancelDownload(serverId: string): void {
  // Cancel logic would be implemented with actual download processes
}

function getCommandForServer(
  server: LSPServerInfo
): { command: string; args: string[] } {
  switch (server.downloadType) {
    case "npm":
      return {
        command: "npm",
        args: ["install", "-g", server.binaryName],
      };
    case "bun":
      return {
        command: "bunx",
        args: ["--bun", server.binaryName],
      };
    case "go":
      return {
        command: "go",
        args: ["install", `${server.binaryName}@latest`],
      };
    case "gem":
      return {
        command: "gem",
        args: ["install", server.binaryName],
      };
    case "dotnet":
      return {
        command: "dotnet",
        args: ["tool", "install", "--global", server.binaryName],
      };
    default:
      return {
        command: server.binaryName,
        args: [],
      };
  }
}

async function downloadNPM(
  server: LSPServerInfo,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const { command, args } = getCommandForServer(server);

    onProgress?.(10, `Installing ${server.name} via npm...`);

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
      onProgress?.(50, `Installing ${server.name}...`);
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(100, `${server.name} installed successfully`);
        resolve(true);
      } else {
        onProgress?.(100, `Failed to install ${server.name}: ${output}`);
        resolve(false);
      }
    });

    proc.on("error", (error) => {
      onProgress?.(100, `Error installing ${server.name}: ${error.message}`);
      resolve(false);
    });
  });
}

async function downloadGitHub(
  server: LSPServerInfo,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  if (!server.downloadUrl) return false;

  onProgress?.(10, `Downloading ${server.name} from GitHub...`);

  const binaryPath = getBinaryPath(server.id);
  const ext = process.platform === "win32" ? ".exe" : "";

  return new Promise((resolve) => {
    const proc = spawn("curl", ["-L", "-o", binaryPath + ext, server.downloadUrl!], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          if (ext) {
            fs.chmodSync(binaryPath + ext, 0o755);
          }
          onProgress?.(100, `${server.name} downloaded successfully`);
          resolve(true);
        } catch (e) {
          onProgress?.(100, `Failed to set permissions: ${e}`);
          resolve(false);
        }
      } else {
        onProgress?.(100, `Failed to download ${server.name}`);
        resolve(false);
      }
    });

    proc.on("error", (error) => {
      onProgress?.(100, `Error downloading ${server.name}: ${error.message}`);
      resolve(false);
    });
  });
}

async function downloadGo(
  server: LSPServerInfo,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const { command, args } = getCommandForServer(server);

    onProgress?.(10, `Installing ${server.name} via go...`);

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, GOPATH: process.env.GOPATH || path.join(process.env.HOME || ".", "go") },
    });

    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
      onProgress?.(50, `Installing ${server.name}...`);
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(100, `${server.name} installed successfully`);
        resolve(true);
      } else {
        onProgress?.(100, `Failed to install ${server.name}: ${output}`);
        resolve(false);
      }
    });

    proc.on("error", (error) => {
      onProgress?.(100, `Error installing ${server.name}: ${error.message}`);
      resolve(false);
    });
  });
}

async function downloadGem(
  server: LSPServerInfo,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const { command, args } = getCommandForServer(server);

    onProgress?.(10, `Installing ${server.name} via gem...`);

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
      onProgress?.(50, `Installing ${server.name}...`);
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(100, `${server.name} installed successfully`);
        resolve(true);
      } else {
        onProgress?.(100, `Failed to install ${server.name}: ${output}`);
        resolve(false);
      }
    });

    proc.on("error", (error) => {
      onProgress?.(100, `Error installing ${server.name}: ${error.message}`);
      resolve(false);
    });
  });
}

async function downloadDotnet(
  server: LSPServerInfo,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const { command, args } = getCommandForServer(server);

    onProgress?.(10, `Installing ${server.name} via dotnet...`);

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
      onProgress?.(50, `Installing ${server.name}...`);
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(100, `${server.name} installed successfully`);
        resolve(true);
      } else {
        onProgress?.(100, `Failed to install ${server.name}: ${output}`);
        resolve(false);
      }
    });

    proc.on("error", (error) => {
      onProgress?.(100, `Error installing ${server.name}: ${error.message}`);
      resolve(false);
    });
  });
}

async function downloadBun(
  server: LSPServerInfo,
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const { command, args } = getCommandForServer(server);

    onProgress?.(10, `Running ${server.name} via bunx...`);

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
      onProgress?.(50, `Running ${server.name}...`);
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(100, `${server.name} ready`);
        resolve(true);
      } else {
        onProgress?.(100, `Failed to run ${server.name}: ${output}`);
        resolve(false);
      }
    });

    proc.on("error", (error) => {
      onProgress?.(100, `Error running ${server.name}: ${error.message}`);
      resolve(false);
    });
  });
}

export const LSPDownloader = {
  needsDownload,
  download,
  downloadAll,
  getDownloadURL,
  cancelDownload,
};
