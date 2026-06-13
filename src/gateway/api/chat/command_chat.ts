import { Request, Response } from 'express';
import { sessionService } from '../../../services/session/index.js';
import { memoryService } from '../../../services/memory/index.js';
import { executeCommand } from '../../../gateway/cli/commands.js';
import { ChatRequest } from '../api.types.js';

export async function POST(req: Request, res: Response) {
  const { message, sessionId } = req.body as ChatRequest;
  try {
    if (!message || !message.trim().startsWith('/')) {
      return res.status(400).json({ success: false, error: 'Invalid command. Commands must start with /' });
    }
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = sessionService.create('Command Session');
      sessionService.switchTo(session.id);
      currentSessionId = session.id;
    }
    const cmdResult = await executeCommand(message.trim());
    memoryService.addMessage(currentSessionId, 'user', message, true);
    memoryService.addMessage(currentSessionId, 'assistant', cmdResult.message || '命令已执行', true);
    res.json({
      success: true,
      data: { response: cmdResult.message || '命令已执行', sessionId: cmdResult.data?.id || currentSessionId, success: cmdResult.success },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
