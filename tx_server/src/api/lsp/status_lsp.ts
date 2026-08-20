import { Request, Response } from "express";
import { LSPManager } from "../../core/lsp/index.js";

export async function GET(req: Request, res: Response) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  try { const s = await LSPManager.getServerStatus(id); res.json({ success: true, data: s }); }
  catch (error) { res.status(400).json({ success: false, error: String(error) }); }
}
