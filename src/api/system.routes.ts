import { Router, Request, Response } from 'express';
import { getVersion } from '../utils/version.js';

export const systemRouter = Router();

systemRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: getVersion(),
    },
  });
});
