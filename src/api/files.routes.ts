/**
 * 文件操作 API 路由模块
 * 
 * 提供文件读写的 RESTful API 接口
 * 
 * 路由列表：
 * - GET  /api/files/tree         -> 获取文件树
 * - GET  /api/files/content     -> 读取文件内容
 * - POST /api/files/write       -> 写入文件
 * - POST /api/files/edit        -> 编辑文件
 * - POST /api/files/delete      -> 删除文件
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../modules/logger/logger.js';

export const filesRouter = Router();

function logError(msg: string, error: unknown): void {
  console.error(`[files.routes] ${msg}:`, error);
}

interface FileTreeItem {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  children?: FileTreeItem[];
}

/**
 * GET /api/files/tree
 * 获取文件树
 */
filesRouter.get('/tree', (req: Request, res: Response) => {
  const basePath = req.query.base_path as string || '/';
  
  try {
    const normalizedPath = path.normalize(basePath);
    
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({ success: false, error: 'Path not found' });
      return;
    }
    
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      res.status(400).json({ success: false, error: 'Path is not a directory' });
      return;
    }
    
    function buildTree(p: string): FileTreeItem[] {
      try {
        const items = fs.readdirSync(p);
        const result: FileTreeItem[] = [];
        
        for (const item of items.sort()) {
          if (item.startsWith('.')) continue;
          
          const itemPath = path.join(p, item);
          try {
            const itemStat = fs.statSync(itemPath);
            
            if (itemStat.isDirectory()) {
              result.push({
                name: item,
                path: itemPath,
                is_directory: true,
                children: buildTree(itemPath),
              });
            } else {
              result.push({
                name: item,
                path: itemPath,
                is_directory: false,
                size: itemStat.size,
              });
            }
          } catch {
            // Skip items we can't stat
          }
        }
        
        return result;
      } catch {
        return [];
      }
    }
    
    const tree = buildTree(normalizedPath);
    res.json(tree);
  } catch (error) {
    logError('Failed to get file tree:', error);
    res.status(500).json({ success: false, error: 'Failed to get file tree' });
  }
});

/**
 * GET /api/files/content
 * 读取文件内容
 */
filesRouter.get('/content', (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  
  if (!filePath) {
    res.status(400).json({ success: false, error: 'Path is required' });
    return;
  }
  
  try {
    const normalizedPath = path.normalize(filePath);
    
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }
    
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      res.status(400).json({ success: false, error: 'Path is not a file' });
      return;
    }
    
    // Try to read as text
    try {
      const content = fs.readFileSync(normalizedPath, 'utf-8');
      res.json({
        path: normalizedPath,
        content,
        size: Buffer.byteLength(content, 'utf-8'),
        encoding: 'utf-8',
        is_binary: false,
      });
    } catch {
      // Binary file
      const content = fs.readFileSync(normalizedPath);
      res.json({
        path: normalizedPath,
        content: '[Binary file]',
        size: content.length,
        encoding: 'binary',
        is_binary: true,
      });
    }
  } catch (error) {
    logError('Failed to read file:', error);
    res.status(500).json({ success: false, error: 'Failed to read file' });
  }
});

/**
 * POST /api/files/write
 * 写入文件
 */
filesRouter.post('/write', (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;
  
  if (!filePath) {
    res.status(400).json({ success: false, error: 'Path is required' });
    return;
  }
  
  try {
    const normalizedPath = path.normalize(filePath);
    const dir = path.dirname(normalizedPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(normalizedPath, content || '', 'utf-8');
    res.json({ success: true, message: 'File written successfully' });
  } catch (error) {
    logError('Failed to write file:', error);
    res.status(500).json({ success: false, error: 'Failed to write file' });
  }
});

/**
 * POST /api/files/edit
 * 编辑文件（替换字符串）
 */
filesRouter.post('/edit', (req: Request, res: Response) => {
  const { path: filePath, old_string, new_string } = req.body;
  
  if (!filePath || old_string === undefined || new_string === undefined) {
    res.status(400).json({ success: false, error: 'Path, old_string, and new_string are required' });
    return;
  }
  
  try {
    const normalizedPath = path.normalize(filePath);
    
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }
    
    const original = fs.readFileSync(normalizedPath, 'utf-8');
    
    if (!original.includes(old_string)) {
      res.json({ success: false, error: 'old_string not found' });
      return;
    }
    
    const newContent = original.replace(old_string, new_string);
    fs.writeFileSync(normalizedPath, newContent, 'utf-8');
    
    res.json({
      success: true,
      original_content: original,
      new_content: newContent,
    });
  } catch (error) {
    logError('Failed to edit file:', error);
    res.status(500).json({ success: false, error: 'Failed to edit file' });
  }
});

/**
 * POST /api/files/delete
 * 删除文件
 */
filesRouter.post('/delete', (req: Request, res: Response) => {
  const { path: filePath } = req.body;
  
  if (!filePath) {
    res.status(400).json({ success: false, error: 'Path is required' });
    return;
  }
  
  try {
    const normalizedPath = path.normalize(filePath);
    
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({ success: false, error: 'Path not found' });
      return;
    }
    
    const stats = fs.statSync(normalizedPath);
    if (stats.isFile()) {
      fs.unlinkSync(normalizedPath);
    } else {
      fs.rmSync(normalizedPath, { recursive: true });
    }
    
    res.json({ success: true });
  } catch (error) {
    logError('Failed to delete:', error);
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});
