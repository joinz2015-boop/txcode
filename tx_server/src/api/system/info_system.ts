import { Request, Response } from 'express';
import { getVersion } from '../../utils/version.js';

export async function GET(_req: Request, res: Response) {
  res.json({ success: true, data: { version: getVersion() } });
}
