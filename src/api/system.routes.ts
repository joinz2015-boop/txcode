import { Router, Request, Response } from 'express';
import config from '../config/tx.config.js';

export const systemRouter = Router();

systemRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: config.version,
    },
  });
});
