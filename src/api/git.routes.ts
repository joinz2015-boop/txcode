/**
 * Git 操作 API 路由模块
 * 
 * 提供 Git 仓库的变更管理 RESTful API 接口
 * 
 * 路由列表：
 * - GET  /api/git/status       -> 获取 Git 变更状态
 * - GET  /api/git/diff/<file>  -> 获取指定文件的 diff
 * - POST /api/git/revert/<file> -> 撤销指定文件的变更
 * - POST /api/git/revert-all   -> 撤销所有变更
 * - POST /api/git/delete-file/<file> -> 删除未跟踪的新文件
 * - GET  /api/git/is-repo      -> 检查当前目录是否为 Git 仓库
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const gitRouter = Router();

function logError(msg: string, error: unknown): void {
  console.error(`[git.routes] ${msg}:`, error);
}

interface GitChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  statusCode: string;
  isNew: boolean;
}

function parseGitStatus(line: string): GitChange | null {
  if (line.length < 3) return null;
  
  const indexStatus = line[0];
  const workTreeStatus = line[1];
  const filePath = line.substring(3).replace(/\\/g, '/');
  
  let status: GitChange['status'];
  let statusCode: string;
  let isNew = false;
  
  const statusChar = workTreeStatus !== ' ' ? workTreeStatus : indexStatus;
  
  switch (statusChar) {
    case 'M':
      status = 'modified';
      statusCode = 'M';
      break;
    case 'A':
      status = 'added';
      statusCode = 'A';
      isNew = indexStatus === 'A';
      break;
    case 'D':
      status = 'deleted';
      statusCode = 'D';
      break;
    case 'R':
      status = 'renamed';
      statusCode = 'R';
      break;
    case '?':
      status = 'untracked';
      statusCode = '??';
      isNew = true;
      break;
    case '!':
    case '~':
      return null;
    default:
      status = 'modified';
      statusCode = statusChar;
  }
  
  return {
    path: filePath,
    status,
    statusCode,
    isNew
  };
}

async function execGitCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const options = cwd ? { cwd } : {};
  try {
    const { stdout, stderr } = await execAsync(command, {
      ...options,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    return { stdout, stderr };
  } catch (error: any) {
    return { stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}

async function getGitRoot(): Promise<string | null> {
  try {
    const { stdout } = await execGitCommand('git rev-parse --show-toplevel');
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function isGitRepo(): Promise<boolean> {
  try {
    await execGitCommand('git rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/git/is-repo
 * 检查当前目录是否为 Git 仓库
 */
gitRouter.get('/is-repo', async (req: Request, res: Response) => {
  try {
    const isRepo = await isGitRepo();
    const gitRoot = isRepo ? await getGitRoot() : null;
    res.json({ success: true, isRepo, gitRoot });
  } catch (error) {
    logError('Failed to check git repo:', error);
    res.status(500).json({ success: false, error: 'Failed to check git repo' });
  }
});

/**
 * GET /api/git/status
 * 获取 Git 变更状态
 */
gitRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const isRepo = await isGitRepo();
    if (!isRepo) {
      res.status(400).json({ success: false, error: 'Not a git repository' });
      return;
    }

    const { stdout } = await execGitCommand('git status --porcelain');
    const changes: GitChange[] = [];
    
    const lines = stdout.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const change = parseGitStatus(line);
      if (change) {
        changes.push(change);
      }
    }
    
    res.json({ success: true, changes, count: changes.length });
  } catch (error) {
    logError('Failed to get git status:', error);
    res.status(500).json({ success: false, error: 'Failed to get git status' });
  }
});

/**
 * GET /api/git/diff/:file
 * 获取指定文件的 diff
 */
gitRouter.get(/\/diff(?:\/(.*))?/, async (req: Request, res: Response) => {
  try {
    const isRepo = await isGitRepo();
    if (!isRepo) {
      res.status(400).json({ success: false, error: 'Not a git repository' });
      return;
    }

    const filePath = req.params[0] || '';
    if (!filePath) {
      res.status(400).json({ success: false, error: 'File path is required' });
      return;
    }

    let command = `git diff -- "${filePath}"`;
    let { stdout, stderr } = await execGitCommand(command);

    if (!stdout && !stderr) {
      command = `git diff --cached -- "${filePath}"`;
      const result = await execGitCommand(command);
      stdout = result.stdout;
      stderr = result.stderr;
    }

    if (!stdout && !stderr) {
      const fullPath = path.join(await getGitRoot() || '', filePath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          stdout = `+ ${content.split('\n').join('\n+ ')}`;
        } catch {
          stdout = '';
        }
      }
    }

    res.json({ success: true, diff: stdout, error: stderr || null });
  } catch (error) {
    logError('Failed to get diff:', error);
    res.status(500).json({ success: false, error: 'Failed to get diff' });
  }
});

/**
 * POST /api/git/revert/*
 * 撤销指定文件的变更
 */
gitRouter.post(/\/revert(?:\/(.*))?/, async (req: Request, res: Response) => {
  try {
    const isRepo = await isGitRepo();
    if (!isRepo) {
      res.status(400).json({ success: false, error: 'Not a git repository' });
      return;
    }

    const filePath = req.params[0] || '';
    if (!filePath) {
      res.status(400).json({ success: false, error: 'File path is required' });
      return;
    }

    const { stderr } = await execGitCommand(`git checkout -- "${filePath}"`);
    
    if (stderr && !stderr.includes('Updated')) {
      res.status(400).json({ success: false, error: stderr });
      return;
    }

    res.json({ success: true, message: `Reverted: ${filePath}` });
  } catch (error: any) {
    logError('Failed to revert file:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to revert file' });
  }
});

/**
 * POST /api/git/revert-all
 * 撤销所有变更
 */
gitRouter.post('/revert-all', async (req: Request, res: Response) => {
  try {
    const isRepo = await isGitRepo();
    if (!isRepo) {
      res.status(400).json({ success: false, error: 'Not a git repository' });
      return;
    }

    const { stderr } = await execGitCommand('git checkout -- .');
    
    if (stderr && !stderr.includes('Updated')) {
      res.status(400).json({ success: false, error: stderr });
      return;
    }

    res.json({ success: true, message: 'All changes reverted' });
  } catch (error: any) {
    logError('Failed to revert all:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to revert all' });
  }
});

/**
 * POST /api/git/delete-file/*
 * 删除未跟踪的新文件
 */
gitRouter.post(/\/delete-file(?:\/(.*))?/, async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0] || '';
    if (!filePath) {
      res.status(400).json({ success: false, error: 'File path is required' });
      return;
    }

    const gitRoot = await getGitRoot();
    if (!gitRoot) {
      res.status(400).json({ success: false, error: 'Not a git repository' });
      return;
    }

    const fullPath = path.join(gitRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    res.json({ success: true, message: `Deleted: ${filePath}` });
  } catch (error: any) {
    logError('Failed to delete file:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete file' });
  }
});

/**
 * POST /api/git/discard-untracked
 * 丢弃所有未跟踪的文件
 */
gitRouter.post('/discard-untracked', async (req: Request, res: Response) => {
  try {
    const isRepo = await isGitRepo();
    if (!isRepo) {
      res.status(400).json({ success: false, error: 'Not a git repository' });
      return;
    }

    const { stdout, stderr } = await execGitCommand('git clean -fd');
    
    if (stderr && !stderr.includes('Removing')) {
      res.status(400).json({ success: false, error: stderr });
      return;
    }

    res.json({ success: true, message: 'Untracked files removed', output: stdout + stderr });
  } catch (error: any) {
    logError('Failed to discard untracked:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to discard untracked files' });
  }
});
