/**
 * LSP Web API 路由
 */

import { Router, Request, Response } from "express";
import {
  LSPManager,
  LSPDownloader,
  getServer,
  getAllServers,
  LSPServerStatus,
  LSPConfig,
  ServerStatus,
  JavaVersionCheck,
} from "../lsp/index.js";

export const lspRouter = Router();

interface ServerInfoResponse {
  id: string;
  name: string;
  extensions: string[];
  enabled: boolean;
  autoStart: boolean;
  status: LSPServerStatus;
  error?: string;
  version?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

lspRouter.get("/servers", async (req: Request, res: Response) => {
  const allServers = getAllServers();
  const config = await LSPManager.loadConfig();

  const servers: ServerInfoResponse[] = [];

  for (const server of allServers) {
    const cfg = config.get(server.id) || { enabled: false, autoStart: false };
    const status = await LSPManager.getServerStatus(server.id);

    servers.push({
      id: server.id,
      name: server.name,
      extensions: server.extensions,
      enabled: cfg.enabled,
      autoStart: cfg.autoStart,
      status: status.status,
      error: status.error,
      version: status.version,
    });
  }

  res.json({ success: true, data: servers });
});

lspRouter.put("/servers/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { enabled, autoStart } = req.body as Partial<LSPConfig>;

  const updateData: Partial<LSPConfig> = {};
  if (enabled !== undefined) updateData.enabled = enabled;
  if (autoStart !== undefined) updateData.autoStart = autoStart;

  try {
    await LSPManager.updateServer(id, updateData);
    res.json({ success: true, message: "Server updated" });
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

lspRouter.post("/servers/:id/start", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const success = await LSPManager.startServer(id);
    if (success) {
      res.json({ success: true, message: "Server started" });
    } else {
      const status = await LSPManager.getServerStatus(id);
      res.status(400).json({ success: false, error: status.error || "Failed to start server" });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

lspRouter.post("/servers/:id/stop", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    await LSPManager.stopServer(id);
    res.json({ success: true, message: "Server stopped" });
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

lspRouter.get("/servers/:id/status", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const status = await LSPManager.getServerStatus(id);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

lspRouter.post("/servers/:id/download", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const success = await LSPDownloader.download(id);
    if (success) {
      res.json({ success: true, message: "Download completed" });
    } else {
      res.status(400).json({ success: false, error: "Download failed" });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

lspRouter.get("/java-version", async (req: Request, res: Response) => {
  try {
    const result = await LSPManager.checkJavaVersion();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});
