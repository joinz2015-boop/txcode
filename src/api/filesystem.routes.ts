/**
 * 文件系统浏览 API 路由模块
 * 
 * 提供文件系统浏览的 RESTful API 接口
 * 
 * 路由列表：
 * - GET /api/filesystem/browse -> 浏览文件系统
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
function logError(msg: string, error: unknown): void {
  console.error(`[filesystem.routes] ${msg}:`, error);
}

export const filesystemRouter = Router();

interface FileSystemItem {
  name: string;
  path: string;
  is_directory: boolean;
  is_drive?: boolean;
  size?: number;
}

/**
 * GET /api/filesystem/browse
 * 浏览文件系统
 * 
 * path为空时: 返回当前工作目录的文件列表
 * path为"/": 返回根目录内容
 * 其他: 返回指定目录内容
 */
filesystemRouter.get('/browse', (req: Request, res: Response) => {
  const inputPath = req.query.path as string;
  
  try {
    const isWindows = os.platform() === 'win32';
    
    // Empty path - return current working directory contents
    if (!inputPath || inputPath === '') {
      const cwd = process.cwd();
      return browseDirectory(cwd, isWindows);
    }
    
    // Root path on Linux/Mac
    if (inputPath === '/') {
      if (isWindows) {
        const cwd = process.cwd();
        return browseDirectory(cwd, isWindows);
      } else {
        return browseDirectory('/', isWindows);
      }
    }
    
    // Validate and browse specified path
    const normalizedPath = path.normalize(inputPath);
    
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ success: false, error: 'Path not found' });
    }
    
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Path is not a directory' });
    }
    
    return browseDirectory(normalizedPath, isWindows);
  } catch (error) {
    logError('Failed to browse filesystem:', error);
    res.status(500).json({ success: false, error: 'Failed to browse filesystem' });
  }
  
  function browseDirectory(dirPath: string, isWin: boolean) {
    let items: FileSystemItem[] = [];
    let parentPath: string | null = null;
    
    try {
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries.sort()) {
        if (entry.startsWith('.')) continue;
        
        const entryPath = path.join(dirPath, entry);
        try {
          const entryStat = fs.statSync(entryPath);
          if (entryStat.isDirectory()) {
            items.push({
              name: entry,
              path: entryPath,
              is_directory: true,
              is_drive: false,
            });
          } else {
            items.push({
              name: entry,
              path: entryPath,
              is_directory: false,
              size: entryStat.size,
            });
          }
        } catch {
          // Skip entries we can't stat
        }
      }
      
      // Calculate parent path
      const parent = path.dirname(dirPath);
      if (parent !== dirPath) {
        parentPath = parent;
      }
      
      // On Windows root (C:\), parent is empty string
      if (isWin && dirPath.length === 3 && dirPath[1] === ':') {
        parentPath = '';
      }
      
    } catch (error) {
      logError('Failed to read directory:', error);
      return res.status(500).json({ success: false, error: 'Failed to read directory' });
    }
    
    return res.json({
      success: true,
      data: {
        current_path: dirPath,
        parent_path: parentPath,
        items,
      }
    });
  }
});

/**
 * GET /api/filesystem/drives
 * 获取 Windows 驱动器列表
 */
filesystemRouter.get('/drives', (req: Request, res: Response) => {
  const isWindows = os.platform() === 'win32';
  
  if (!isWindows) {
    return res.json({
      success: true,
      data: {
        current_path: '/',
        parent_path: null,
        items: [{ name: '/', path: '/', is_directory: true, is_drive: false }],
      }
    });
  }
  
  const drives = getWindowsDrives();
  return res.json({
    success: true,
    data: {
      current_path: '',
      parent_path: null,
      items: drives,
    }
  });
});

function getWindowsDrives(): FileSystemItem[] {
  const drives: FileSystemItem[] = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (const letter of letters) {
    const drivePath = `${letter}:\\`;
    try {
      if (fs.existsSync(drivePath)) {
        drives.push({
          name: `${letter}:`,
          path: drivePath,
          is_directory: true,
          is_drive: true,
        });
      }
    } catch {
      // Drive not accessible
    }
  }
  
  return drives;
}

function getRootContents(): FileSystemItem[] {
  const items: FileSystemItem[] = [];
  const root = '/';
  
  try {
    const entries = fs.readdirSync(root);
    for (const entry of entries.sort()) {
      if (entry.startsWith('.')) continue;
      
      const entryPath = path.join(root, entry);
      try {
        const stats = fs.statSync(entryPath);
        items.push({
          name: entry,
          path: entryPath,
          is_directory: stats.isDirectory(),
          is_drive: false,
        });
      } catch {
        // Skip entries we can't stat
      }
    }
  } catch {
    // Root not accessible
  }
  
  return items;
}
