import { Request, Response } from 'express';
import { memoryService } from '../../../services/memory/index.js';

export async function GET(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId 必填' });
  try {
    const messages = memoryService.getAllMessages(sessionId);
    const messageFiles = memoryService.getMessageFiles(sessionId);
    const filesByMsg: Map<number, { filePath: string; url: string; type: string }[]> = new Map();
    for (const mf of messageFiles) {
      if (!filesByMsg.has(mf.messageId)) {
        filesByMsg.set(mf.messageId, []);
      }
      filesByMsg.get(mf.messageId)!.push({
        filePath: mf.filePath,
        url: `/api/chat/file_download?filePath=${encodeURIComponent(mf.filePath)}`,
        type: mf.fileType,
      });
    }
    const result: any[] = [];
    for (const msg of messages) {
      if (msg.role === 'user' && (msg as any).isOriginal) {
        const userFiles = filesByMsg.get(msg.id);
        result.push({
          type: 'chat',
          role: 'user',
          content: msg.content,
          mediaFiles: userFiles || [],
        });
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
