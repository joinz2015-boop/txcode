import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const MEMORY_FILE = 'MEMORY.md';

function getMemoryDir(projectPath: string): string {
  return path.join(projectPath, '.txcode', 'memory');
}

function getMemoryFilePath(projectPath: string): string {
  return path.join(getMemoryDir(projectPath), MEMORY_FILE);
}

function ensureMemoryDir(projectPath: string): void {
  const dir = getMemoryDir(projectPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function POST(req: Request, res: Response) {
  try {
    const { projectPath, content } = req.body;
    if (!projectPath) return res.status(400).json({ success: false, error: 'projectPath 必填' });
    if (content === undefined) return res.status(400).json({ success: false, error: 'content 必填' });
    ensureMemoryDir(projectPath);
    const filePath = getMemoryFilePath(projectPath);
    const encoded = new TextEncoder().encode(content);
    fs.writeFileSync(filePath, encoded);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
