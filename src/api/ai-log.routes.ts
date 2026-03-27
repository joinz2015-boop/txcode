import { Router, Request, Response } from 'express';
import { aiLogService } from '../modules/ai/ai-log.service.js';

export const aiLogRouter = Router();

aiLogRouter.get('/logs', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;

  try {
    const result = aiLogService.getLogs(page, pageSize);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
