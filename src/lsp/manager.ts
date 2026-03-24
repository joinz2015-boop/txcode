/**
 * LSP 管理器
 */

import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import { dbService } from "../modules/db/index.js";
import { servers, getServer } from "./server.js";
import { LSPClient } from "./client.js";
import { LSPDownloader } from "./downloader.js";
import { LSPServerStatus, ServerStatus, LSPConfig, JavaVersionCheck } from "./types.js";
import { lspServerTable, insertLSPServerSQL, defaultLSPServers } from "./sql.js";

const TXCODE_BIN_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".txcode",
  "bin"
);

interface ServerState {
  client: LSPClient | null;
  status: LSPServerStatus;
  error?: string;
  version?: number;
}

export namespace LSPManager {
  const serverStates: Map<string, ServerState> = new Map();
  const configCache: Map<string, LSPConfig> = new Map();

  export async function initDatabase(): Promise<void> {
    dbService.run(lspServerTable);

    const now = Date.now();
    for (const server of defaultLSPServers) {
      dbService.run(insertLSPServerSQL, [server.id, server.enabled, server.auto_start, now, now]);
    }
  }

  export async function loadConfig(): Promise<Map<string, LSPConfig>> {
    const rows = dbService.all<{ id: string; enabled: number; auto_start: number }>(
      "SELECT id, enabled, auto_start FROM lsp_server"
    );

    configCache.clear();
    for (const row of rows) {
      configCache.set(row.id, {
        enabled: row.enabled === 1,
        autoStart: row.auto_start === 1,
      });
    }

    return configCache;
  }

  export async function saveConfig(config: Map<string, LSPConfig>): Promise<void> {
    const now = Date.now();

    for (const [id, cfg] of config.entries()) {
      dbService.run(
        "UPDATE lsp_server SET enabled = ?, auto_start = ?, updated_at = ? WHERE id = ?",
        [cfg.enabled ? 1 : 0, cfg.autoStart ? 1 : 0, now, id]
      );
    }

    configCache.clear();
    for (const [id, cfg] of config.entries()) {
      configCache.set(id, cfg);
    }
  }

  export async function updateServer(id: string, config: Partial<LSPConfig>): Promise<void> {
    const current = configCache.get(id) || { enabled: false, autoStart: false };
    const updated = { ...current, ...config };

    const now = Date.now();
    dbService.run(
      "UPDATE lsp_server SET enabled = ?, auto_start = ?, updated_at = ? WHERE id = ?",
      [updated.enabled ? 1 : 0, updated.autoStart ? 1 : 0, now, id]
    );

    configCache.set(id, updated);

    if (!updated.enabled) {
      await stopServer(id);
    } else if (updated.autoStart && updated.enabled) {
      await startServer(id);
    }
  }

  export async function checkServerExists(serverId: string): Promise<boolean> {
    const server = getServer(serverId);
    if (!server) return false;

    if (server.requiresSystemBinary) return true;

    const binaryPath = getBinaryPath(serverId);
    return fs.existsSync(binaryPath);
  }

  export function getServerPath(serverId: string): string {
    return getBinaryPath(serverId);
  }

  export async function startServer(serverId: string): Promise<boolean> {
    const server = getServer(serverId);
    if (!server) {
      updateServerStatus(serverId, LSPServerStatus.NotFound, "Server not found");
      return false;
    }

    const state = serverStates.get(serverId) || { client: null, status: LSPServerStatus.Stopped };
    if (state.status === LSPServerStatus.Running) {
      return true;
    }

    if (server.requiresJava) {
      const javaCheck = await checkJavaVersion();
      if (!javaCheck.valid) {
        updateServerStatus(serverId, LSPServerStatus.VersionError, javaCheck.error, javaCheck.version);
        return false;
      }
    }

    if (server.requiresSystemBinary) {
      const binaryPath = findSystemBinary(server.binaryName);
      if (!binaryPath) {
        updateServerStatus(serverId, LSPServerStatus.NotFound, `System binary not found: ${server.binaryName}`);
        return false;
      }
    } else {
      const needsDl = await LSPDownloader.needsDownload(serverId);
      if (needsDl) {
        updateServerStatus(serverId, LSPServerStatus.Downloading);
        const success = await LSPDownloader.download(serverId);
        if (!success) {
          updateServerStatus(serverId, LSPServerStatus.DownloadFailed, "Download failed");
          return false;
        }
      }
    }

    const client = new LSPClient(serverId);
    const rootPath = process.cwd();
    const binaryPath = getBinaryPath(serverId);
    const ext = process.platform === "win32" ? ".exe" : "";

    try {
      const command = server.requiresSystemBinary
        ? findSystemBinary(server.binaryName) || server.binaryName
        : binaryPath + ext;

      const args = server.defaultArgs || (server.id === "java" ? ["-data", rootPath] : []);

      const connected = await client.connect(server, rootPath, command, args);

      if (connected) {
        state.client = client;
        updateServerStatus(serverId, LSPServerStatus.Running);

        client.on("close", () => {
          updateServerStatus(serverId, LSPServerStatus.Stopped);
        });

        client.on("error", (error) => {
          updateServerStatus(serverId, LSPServerStatus.Stopped, String(error));
        });

        return true;
      } else {
        updateServerStatus(serverId, LSPServerStatus.NotFound, "Failed to connect");
        return false;
      }
    } catch (error) {
      updateServerStatus(serverId, LSPServerStatus.NotFound, String(error));
      return false;
    }
  }

  export async function stopServer(serverId: string): Promise<void> {
    const state = serverStates.get(serverId);
    if (state?.client) {
      try {
        await state.client.shutdown();
      } catch (e) {
        // Ignore shutdown errors
      }
      state.client = null;
    }
    updateServerStatus(serverId, LSPServerStatus.Stopped);
  }

  export async function getServerStatus(serverId: string): Promise<ServerStatus> {
    const state = serverStates.get(serverId);
    return {
      status: state?.status || LSPServerStatus.Stopped,
      error: state?.error,
      version: state?.version,
    };
  }

  export async function initDefaultConfig(): Promise<void> {
    await loadConfig();
  }

  export async function checkJavaVersion(): Promise<JavaVersionCheck> {
    try {
      const javaPath = which("java");
      if (!javaPath) {
        return {
          valid: false,
          error: "Java 未安装，请安装 Java 21 或更高版本",
        };
      }

      const output = execSync("java -version 2>&1").toString();
      const match = output.match(/"(\d+)\.\d+\.\d+"/);

      if (!match) {
        return {
          valid: false,
          error: "无法解析 Java 版本",
        };
      }

      const version = parseInt(match[1]);

      if (version < 21) {
        return {
          valid: false,
          version,
          error: `Java 版本过低：${version}，JDTLS 需要 Java 21 或更高版本`,
        };
      }

      return { valid: true, version };
    } catch (error: any) {
      return {
        valid: false,
        error: `检查 Java 版本失败: ${error.message}`,
      };
    }
  }

  export async function stopAll(): Promise<void> {
    for (const serverId of serverStates.keys()) {
      await stopServer(serverId);
    }
  }

  function updateServerStatus(
    serverId: string,
    status: LSPServerStatus,
    error?: string,
    version?: number
  ): void {
    const state = serverStates.get(serverId) || { client: null, status: LSPServerStatus.Stopped };
    state.status = status;
    state.error = error;
    state.version = version;
    serverStates.set(serverId, state);
  }

  function getBinaryPath(serverId: string): string {
    return path.join(TXCODE_BIN_DIR, serverId);
  }

  function which(binary: string): string | null {
    const PATH = process.env.PATH || process.env.Path || "";
    const pathSeparator = process.platform === "win32" ? ";" : ":";

    for (const dir of PATH.split(pathSeparator)) {
      if (process.platform === "win32") {
        const fullPathCmd = path.join(dir, binary + ".cmd");
        if (fs.existsSync(fullPathCmd)) {
          return fullPathCmd;
        }
        const fullPathBat = path.join(dir, binary + ".bat");
        if (fs.existsSync(fullPathBat)) {
          return fullPathBat;
        }
        const fullPathExe = path.join(dir, binary + ".exe");
        if (fs.existsSync(fullPathExe)) {
          return fullPathExe;
        }
      }
      const fullPath = path.join(dir, binary);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  function findSystemBinary(binaryName: string): string | null {
    return which(binaryName);
  }
}
