import { Request, Response } from 'express';
import { aiService } from '../../../core/ai/index.js';
import { sessionService } from '../../../modules/session/index.js';
import { memoryService } from '../../../core/memory/index.js';
import { ChatRequest } from '../api.types.js';

export async function POST(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { message, sessionId, projectPath } = req.body as ChatRequest;

  try {
    let session = sessionId ? sessionService.get(sessionId) : null;
    if (!session) session = sessionService.create('New Chat', projectPath);
    sessionService.switchTo(session.id);
    memoryService.addMessage(session.id, 'user', message, true);
    const messages = memoryService.getPermanentMessages(session.id);

    for await (const chunk of aiService.chatStream(
      messages.map(m => ({ role: m.role, content: m.content }))
    )) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    res.end();
  }
}
