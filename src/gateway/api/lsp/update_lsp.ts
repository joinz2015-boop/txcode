import { Request, Response } from "express";
import { LSPManager } from "../../../core/lsp/index.js";

export async function POST(req: Request, res: Response) {
  const { id, enabled, autoStart } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  const updateData: Record<string, unknown> = {};
  if (enabled !== undefined) updateData.enabled = enabled;
  if (autoStart !== undefined) updateData.autoStart = autoStart;
  try { await LSPManager.updateServer(id, updateData as any); res.json({ success: true, message: "Server updated" }); }
  catch (error) { res.status(400).json({ success: false, error: String(error) }); }
}
