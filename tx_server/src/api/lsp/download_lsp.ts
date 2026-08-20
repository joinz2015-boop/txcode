import { Request, Response } from "express";
import { LSPDownloader } from "../../core/lsp/index.js";

export async function POST(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "id 必填" });
  try {
    const ok = await LSPDownloader.download(id);
    ok ? res.json({ success: true, message: "Download completed" }) : res.status(400).json({ success: false, error: "Download failed" });
  } catch (error) { res.status(400).json({ success: false, error: String(error) }); }
}
