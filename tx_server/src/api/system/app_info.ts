import { Request, Response } from 'express';
import { appInfo } from '../../app.js';

export async function GET(_req: Request, res: Response) {
  res.json({ success: true, data: appInfo });
}
