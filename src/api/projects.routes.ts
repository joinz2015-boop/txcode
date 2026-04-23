/**
 * 项目和文件 API 路由模块
 * 
 * 提供项目和文件管理的 RESTful API接口
 * 
 * 路由列表：
 * - GET    /api/projects              -> 获取项目列表
 * - POST   /api/projects              -> 创建项目
 * - GET    /api/projects/current      -> 获取当前项目
 * - POST   /api/projects/current      -> 设置当前项目
 * - GET    /api/projects/:id          -> 获取项目详情
 * - DELETE /api/projects/:id          -> 删除项目
 * - POST   /api/projects/:id/activate -> 激活项目
 * - GET    /api/projects/:id/files    -> 获取项目文件树
 * - GET    /api/projects/:id/files/content -> 读取文件内容
 * - POST   /api/projects/:id/files    -> 写入文件
 * - DELETE /api/projects/:id/files    -> 删除文件
 */

import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { projectService } from '../services/project/project.service.js';

export const projectsRouter = Router();

function logError(msg: string, error: unknown): void {
  console.error(`[projects.routes] ${msg}:`, error);
}

interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
  is_active: number;
  is_favorite: number;
  last_opened_at: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  is_directory: boolean;
  has_children?: boolean;
  is_binary?: boolean;
  size?: number;
  modified_at?: string;
  children?: FileTreeNode[];
}

function buildFileTreeSingleLevel(dirPath: string, basePath: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items.sort()) {
      if (item.startsWith('.')) continue;
      
      const fullPath = path.join(dirPath, item);
      const relPath = path.relative(basePath, fullPath).replace(/\\/g, '/');
      
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          nodes.push({
            name: item,
            path: '/' + relPath,
            is_directory: false,
            has_children: false,
            size: stat.size,
            modified_at: stat.mtime.toISOString(),
            is_binary: false,
          });
        } else if (stat.isDirectory()) {
          let hasChildren = false;
          try {
            hasChildren = fs.readdirSync(fullPath).some(child => !child.startsWith('.'));
          } catch (e) {}
          
          nodes.push({
            name: item,
            path: '/' + relPath,
            is_directory: true,
            has_children: hasChildren,
            children: [],
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return nodes;
}

/**
 * GET /api/projects
 * 获取项目列表
 */
projectsRouter.get('/', (req: Request, res: Response) => {
  try {
    const projects = projectService.getAllProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    logError('Failed to get projects:', error);
    res.status(500).json({ success: false, error: 'Failed to get projects' });
  }
});

/**
 * POST /api/projects
 * 创建项目
 */
projectsRouter.post('/', (req: Request, res: Response) => {
  const { name, path: projectPath, description = '' } = req.body;

  if (!name || !projectPath) {
    return res.status(400).json({ success: false, error: 'name and path are required' });
  }

  try {
    const project = projectService.createProject(name, projectPath, description);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    logError('Failed to create project:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

/**
 * GET /api/projects/current
 * 获取当前项目
 */
projectsRouter.get('/current', (req: Request, res: Response) => {
  try {
    const project = projectService.getCurrentProject();
    if (!project) {
      return res.status(404).json({ success: false, error: 'No active project' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    logError('Failed to get current project:', error);
    res.status(500).json({ success: false, error: 'Failed to get current project' });
  }
});

projectsRouter.post('/current', (req: Request, res: Response) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'projectId is required' });
  }

  try {
    projectService.setCurrentProject(projectId);
    res.json({ success: true, message: 'Current project updated' });
  } catch (error) {
    logError('Failed to set current project:', error);
    res.status(500).json({ success: false, error: 'Failed to set current project' });
  }
});

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
projectsRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const project = projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.json({ success: true, data: project });
  } catch (error) {
    logError('Failed to get project:', error);
    res.status(500).json({ success: false, error: 'Failed to get project' });
  }
});

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
projectsRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const project = projectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    projectService.deleteProject(id);
    res.json({ success: true });
  } catch (error) {
    logError('Failed to delete project:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

/**
 * POST /api/projects/:id/activate
 * 激活项目
 */
projectsRouter.post('/:id/activate', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    projectService.setCurrentProject(id);
    res.json({ success: true });
  } catch (error) {
    logError('Failed to activate project:', error);
    res.status(500).json({ success: false, error: 'Failed to activate project' });
  }
});

/**
 * GET /api/projects/:id/files
 * 获取项目文件树
 */
projectsRouter.get('/:id/files', (req: Request, res: Response) => {
  const { id } = req.params;
  const filePath = (req.query.path as string) || '/';
  const recursive = req.query.recursive === 'true';
  
  try {
    const project = projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const targetPath = filePath === '/' 
      ? project.path 
      : path.join(project.path, filePath.replace(/^\//, ''));
    
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, error: 'Path not found' });
    }
    
    if (!fs.statSync(targetPath).isDirectory()) {
      return res.status(400).json({ success: false, error: 'Path is not a directory' });
    }
    
    const children = buildFileTreeSingleLevel(targetPath, project.path);
    const nodeName = filePath === '/' ? path.basename(project.path) || 'root' : path.basename(targetPath);
    const nodePath = filePath;
    
    res.json({
      name: nodeName,
      path: nodePath,
      is_directory: true,
      children,
    });
  } catch (error) {
    logError('Failed to get files:', error);
    res.status(500).json({ success: false, error: 'Failed to get files' });
  }
});

/**
 * GET /api/projects/:id/files/content
 * 读取文件内容
 */
projectsRouter.get('/:id/files/content', (req: Request, res: Response) => {
  const { id } = req.params;
  const filePath = req.query.path as string;
  
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'path is required' });
  }
  
  try {
    const project = projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const fullPath = path.join(project.path, filePath.replace(/^\//, ''));
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    if (!fs.statSync(fullPath).isFile()) {
      return res.status(400).json({ success: false, error: 'Path is not a file' });
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.json({
        path: filePath,
        content,
        size: Buffer.byteLength(content, 'utf-8'),
        encoding: 'utf-8',
        is_binary: false,
      });
    } catch (e) {
      const buffer = fs.readFileSync(fullPath);
      res.json({
        path: filePath,
        content: '[Binary file]',
        size: buffer.length,
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
 * POST /api/projects/:id/files
 * 写入文件
 */
projectsRouter.post('/:id/files', (req: Request, res: Response) => {
  const { id } = req.params;
  const { path: filePath, content } = req.body;
  
  if (!filePath || content === undefined) {
    return res.status(400).json({ success: false, error: 'path and content are required' });
  }
  
  try {
    const project = projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const fullPath = path.join(project.path, filePath.replace(/^\//, ''));
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, message: 'File written successfully' });
  } catch (error) {
    logError('Failed to write file:', error);
    res.status(500).json({ success: false, error: 'Failed to write file' });
  }
});

/**
 * DELETE /api/projects/:id/files
 * 删除文件
 */
projectsRouter.delete('/:id/files', (req: Request, res: Response) => {
  const { id } = req.params;
  const filePath = req.query.path as string;
  
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'path is required' });
  }
  
  try {
    const project = projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const fullPath = path.join(project.path, filePath.replace(/^\//, ''));
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    if (fs.statSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    logError('Failed to delete file:', error);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});
