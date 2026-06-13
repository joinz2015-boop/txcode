import { Request, Response } from "express";
import { LSPManager, getAllServers, LSPServerStatus, LSPConfig } from "../../core/lsp/index.js";

interface ServerInfoResponse { id: string; name: string; extensions: string[]; enabled: boolean; autoStart: boolean; status: LSPServerStatus; error?: string; version?: number; }

export async function GET(_req: Request, res: Response) {
  const allServers = getAllServers();
  const config = await LSPManager.loadConfig();
  const servers: ServerInfoResponse[] = [];
  for (const server of allServers) {
    const cfg = config.get(server.id) || { enabled: false, autoStart: false };
    const status = await LSPManager.getServerStatus(server.id);
    servers.push({ id: server.id, name: server.name, extensions: server.extensions, enabled: cfg.enabled, autoStart: cfg.autoStart, status: status.status, error: status.error, version: status.version });
  }
  res.json({ success: true, data: servers });
}
