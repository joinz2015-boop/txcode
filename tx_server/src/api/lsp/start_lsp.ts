import { Request, Response } from "express";
import { LSPManager } from "../../core/lsp/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  try {
    const success = await LSPManager.startServer(id);
    if (success) res.json({ success: true, message: "Server started" });
    else { const s = await LSPManager.getServerStatus(id); res.status(400).json({ success: false, error: s.error || "Failed" }); }
  } catch (error) { res.status(400).json({ success: false, error: String(error) }); }
}
