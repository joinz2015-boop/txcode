import { Request, Response } from "express";
import { dbService } from "../../../core/db/index.js";
import { getVersion } from "../../../utils/version.js";

export async function GET(_req: Request, res: Response) {
  const currentVersion = getVersion();
  const releases = dbService.all("SELECT * FROM releases ORDER BY version DESC LIMIT 5", []);
  res.json({ success: true, data: { currentVersion, releases } });
}
