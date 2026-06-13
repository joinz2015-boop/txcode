import { Request, Response } from 'express';
import { sessionService } from '../../../services/session/index.js';
import { memoryService } from '../../../core/memory/index.js';
import { configService } from '../../../core/config/index.js';
import { SummarizerService } from '../../../core/ai/summarizer/index.js';

const summarizerService = new SummarizerService(sessionService, memoryService, configService);

export async function POST(req: Request, res: Response) {
  const id = req.body.id as string;
  if (!id) return res.status(400).json({ success: false, error: 'id 必填' });
  try {
    await summarizerService.compact({ sessionId: id });
    const session = sessionService.get(id);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
