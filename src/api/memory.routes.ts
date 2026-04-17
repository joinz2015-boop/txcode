/**
 * 记忆 API 路由模块
 *
 * 路由列表：
 * - GET    /api/memory              -> 获取记忆列表
 * - POST   /api/memory/save        -> 保存记忆
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export const memoryRouter = Router();

const MEMORY_FILE = 'MEMORY.md';
const SEPARATOR = '§';

interface MemoryItem {
  content: string;
  description: string;
}

memoryRouter.get('/', getMemory);
memoryRouter.post('/save', saveMemory);

function parseMemoryFile(content: string): MemoryItem[] {
  if (!content || !content.trim()) {
    return [];
  }

  const parts = content.split(SEPARATOR);
  return parts.filter(p => p.trim()).map(part => {
    const lines = part.trim().split('\n');
    const firstSepIndex = lines.findIndex(l => l.trim() === '---');

    if (firstSepIndex === -1) {
      return {
        content: part.trim(),
        description: ''
      };
    }

    const contentPart = lines.slice(0, firstSepIndex).join('\n').trim();
    const descPart = lines.slice(firstSepIndex + 1).join('\n').trim();

    return {
      content: contentPart,
      description: descPart
    };
  });
}

function getMemoryDir(projectPath: string): string {
  return path.join(projectPath, '.txcode', 'memory');
}

function getMemoryFilePath(projectPath: string): string {
  return path.join(getMemoryDir(projectPath), MEMORY_FILE);
}

function ensureMemoryDir(projectPath: string): void {
  const dir = getMemoryDir(projectPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function getMemory(req: Request, res: Response) {
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
      return res.json({
        success: true,
        data: {
          items: [],
          rawContent: ''
        }
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const items = parseMemoryFile(content);

    res.json({
      success: true,
      data: {
        items,
        rawContent: content
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function saveMemory(req: Request, res: Response) {
  try {
    const { projectPath, content } = req.body;

    if (!projectPath) {
      return res.status(400).json({ success: false, error: 'projectPath 必填' });
    }

    if (content === undefined) {
      return res.status(400).json({ success: false, error: 'content 必填' });
    }

    ensureMemoryDir(projectPath);
    const filePath = getMemoryFilePath(projectPath);

    const encoded = new TextEncoder().encode(content);
    fs.writeFileSync(filePath, encoded);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}