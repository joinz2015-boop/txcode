/**
 * LSP 主入口
 */

import { LSPManager } from "./manager.js";
import { LSPClient } from "./client.js";
import { LSPDownloader } from "./downloader.js";
import { servers, getServer, getAllServers, getServersByExtension } from "./server.js";
import { LSPServerInfo, LSPServerStatus, ServerStatus, LSPConfig, JavaVersionCheck } from "./types.js";

export {
  LSPManager,
  LSPClient,
  LSPDownloader,
  servers,
  getServer,
  getAllServers,
  getServersByExtension,
  LSPServerInfo,
  LSPServerStatus,
  ServerStatus,
  LSPConfig,
  JavaVersionCheck,
};

export async function initLSP(): Promise<void> {
  await LSPManager.initDatabase();
  await LSPManager.initDefaultConfig();

  const config = await LSPManager.loadConfig();

  for (const [serverId, cfg] of config.entries()) {
    if (cfg.enabled && cfg.autoStart) {
      const exists = await LSPManager.checkServerExists(serverId);
      if (exists) {
        await LSPManager.startServer(serverId);
      } else {
        await LSPDownloader.download(serverId);
        await LSPManager.startServer(serverId);
      }
    }
  }
}

export async function shutdownLSP(): Promise<void> {
  await LSPManager.stopAll();
}
