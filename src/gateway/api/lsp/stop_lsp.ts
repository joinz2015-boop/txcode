import { Request, Response } from "express";
import { LSPManager } from "../../../core/lsp/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  try { await LSPManager.stopServer(id); res.json({ success: true, message: "Server stopped" }); }
  catch (error) { res.status(400).json({ success: false, error: String(error) }); }
}
