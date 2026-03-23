import { Router, Request, Response } from 'express';
import { aiService } from '../modules/ai/index.js';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { skillsManager } from '../modules/skill/index.js';
import { ApiResponse, ChatRequest } from './api.types.js';

export const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { message, sessionId, projectPath, skill } = req.body as ChatRequest;

  try {
    let session = sessionId ? sessionService.get(sessionId) : null;
    
    if (!session) {
      session = sessionService.create('New Chat', projectPath);
    }

    sessionService.switchTo(session.id);

    const reactSteps: any[] = [];

    const result = await aiService.chatWithReAct(message, {
      sessionId: session.id,
      projectPath: session.projectPath || undefined,
      memoryService,
      onStep: (step, iteration) => {
        reactSteps.push({
          iteration,
          thought: step.thought,
          action: step.action,
          actionInput: typeof step.actionInput === 'string' 
            ? step.actionInput 
            : JSON.stringify(step.actionInput),
          observation: step.observation,
          remember: step.remember,
        });
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        response: result.answer || result.steps[result.steps.length - 1]?.thought,
        reactSteps: reactSteps.length > 0 ? reactSteps : undefined,
        iterations: result.iterations,
        success: result.success,
        error: result.error,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

chatRouter.post('/stream', async (req: Request, res: Response) => {
  const { message, sessionId, projectPath } = req.body as ChatRequest;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let session = sessionId ? sessionService.get(sessionId) : null;
    
    if (!session) {
      session = sessionService.create('New Chat', projectPath);
    }

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
});

chatRouter.get('/history/:sessionId', (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);

  try {
    const messages = memoryService.getAllMessages(sessionId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
