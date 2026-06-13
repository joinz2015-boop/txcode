import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const MEMORY_FILE = 'MEMORY.md';
const SEPARATOR = '§';

interface MemoryItem {
  content: string;
  description: string;
}

function parseMemoryFile(content: string): MemoryItem[] {
  if (!content || !content.trim()) return [];
  const parts = content.split(SEPARATOR);
  return parts.filter(p => p.trim()).map(part => {
    const lines = part.trim().split('\n');
    const firstSepIndex = lines.findIndex(l => l.trim() === '---');
    if (firstSepIndex === -1) return { content: part.trim(), description: '' };
    return {
      content: lines.slice(0, firstSepIndex).join('\n').trim(),
      description: lines.slice(firstSepIndex + 1).join('\n').trim(),
    };
  });
}

function getMemoryFilePath(projectPath: string): string {
  return path.join(projectPath, '.txcode', 'memory', MEMORY_FILE);
}

export async function GET(req: Request, res: Response) {
  try {
    let { projectPath } = req.query;
    if (!projectPath) {
      const sessionRes = await fetch(`${process.env.API_BASE || ''}/api/sessions/current`);
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json() as { data?: { projectPath?: string } };
        projectPath = sessionData.data?.projectPath;
      }
    }
    if (!projectPath) {
      return res.status(400).json({ success: false, error: 'projectPath 必填' });
    }
    const filePath = getMemoryFilePath(projectPath as string);
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, data: { items: [], rawContent: '' } });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const items = parseMemoryFile(content);
    res.json({ success: true, data: { items, rawContent: content } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
