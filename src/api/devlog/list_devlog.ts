import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { projectService } from '../../services/project/project.service.js';

export async function GET(req: Request, res: Response) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }
  try {
    const date = new Date().toISOString().slice(0, 10);
    const sessionIdSuffix = sessionId.slice(-12);
    const logPath = path.resolve(projectService.getCurrentProjectPath(), '.txcode', 'session', date, sessionIdSuffix, 'devlog.md');
    let content = '';
    if (fs.existsSync(logPath)) content = fs.readFileSync(logPath, 'utf-8');
    res.json({ success: true, data: { content } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
