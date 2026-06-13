import { Request, Response } from 'express';
import { codeChatService } from '../../services/codeChat/index.js';
import { commandChatService } from '../../services/commandChat/index.js';
import { ChatRequest } from '../api.types.js';

export async function POST(req: Request, res: Response) {
  const { message, sessionId, projectPath, modelName } = req.body as ChatRequest;
  try {
    if (message && message.trim().startsWith('/')) {
      const result = await commandChatService.handleCommand({ message, sessionId });
      return res.json({ success: true, data: result });
    }
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
