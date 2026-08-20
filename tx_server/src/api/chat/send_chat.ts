import { Request, Response } from 'express';
import { codeChatService } from '../../service/codeChat/index.js';
import { ChatRequest } from '../api.types.js';

export async function POST(req: Request, res: Response) {
  const { message, sessionId, projectPath, modelName } = req.body as ChatRequest;
  try {
    const result = await codeChatService.handleChat({ message, sessionId, projectPath, modelName });
    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        response: result.answer,
        reactSteps: result.reactSteps,
        iterations: result.iterations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
