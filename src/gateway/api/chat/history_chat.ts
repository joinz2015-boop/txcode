import { Request, Response } from 'express';
import { memoryService } from '../../../core/memory/index.js';

export async function GET(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId 必填' });
  try {
    const messages = memoryService.getAllMessages(sessionId);
    const result: any[] = [];
    for (const msg of messages) {
      if (msg.role === 'user' && (msg as any).isOriginal) {
        result.push({ type: 'chat', role: 'user', content: msg.content });
      }
      if (msg.role === 'assistant') {
        let thought = '';
        let toolCalls: any[] = [];
        let success = true;
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.type === 'assistant_with_tools' && parsed.toolCalls) {
            thought = parsed.thought || '';
            success = parsed.success !== false;
            toolCalls = parsed.toolCalls;
          }
        } catch { thought = msg.content; }
        result.push({ type: 'step', role: 'assistant', thought, toolCalls, success });
      }
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
