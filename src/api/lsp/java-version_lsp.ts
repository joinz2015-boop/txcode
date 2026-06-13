import { Request, Response } from "express";
import { LSPManager } from "../../core/lsp/index.js";

export async function GET(_req: Request, res: Response) {
  try { const r = await LSPManager.checkJavaVersion(); res.json({ success: true, data: r }); }
  catch (error) { res.status(400).json({ success: false, error: String(error) }); }
}
