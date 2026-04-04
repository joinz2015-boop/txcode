import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as os from 'os';
import { specManager, specRepositoryService, specInjector } from '../modules/spec/index.js';
import { memoryService } from '../modules/memory/index.js';
import { sessionService } from '../modules/session/index.js';

export const specsRouter = Router();

function getProjectPathFromRequest(req: Request): string | null {
  const sessionId = req.query.sessionId as string || req.body?.sessionId;
  if (sessionId) {
    const session = sessionService.get(sessionId);
    return session?.projectPath || null;
  }
  return null;
}

function getDefaultProjectPath(): string {
  return process.cwd();
}

function initProjectSpecPath(req: Request): void {
  const sessionPath = getProjectPathFromRequest(req);
  const projectPath = sessionPath || getDefaultProjectPath();
  specManager.setProjectPath(projectPath);
}

specsRouter.get('/project-path', (req: Request, res: Response) => {
  const sessionPath = getProjectPathFromRequest(req);
  const projectPath = sessionPath || getDefaultProjectPath();
  res.json({
    success: true,
    data: {
      projectPath,
      hasSession: !!sessionPath,
    },
  });
});

specsRouter.get('/local', (req: Request, res: Response) => {
  const sessionPath = getProjectPathFromRequest(req);
  const queryPath = req.query.projectPath as string;
  const projectPath = queryPath || sessionPath || getDefaultProjectPath();
  
  specManager.setProjectPath(projectPath);
  const specs = specManager.getLocalSpecs();
  
  res.json({
    success: true,
    data: {
      specs: specs.map(s => ({
        name: s.name,
        description: s.description,
        read_mode: s.read_mode,
        filePath: s.filePath,
      })),
      projectPath,
    },
  });
});

specsRouter.get('/local/:name/SPEC.md', (req: Request, res: Response) => {
  const sessionPath = getProjectPathFromRequest(req);
  const queryPath = req.query.projectPath as string;
  const projectPath = queryPath || sessionPath || getDefaultProjectPath();
  specManager.setProjectPath(projectPath);
  const name = String(req.params.name);
  const content = specManager.getSpecContent(name);

  if (content === null) {
    return res.status(404).json({ success: false, error: 'Spec not found' });
  }

  res.json({
    success: true,
    data: content,
  });
});

specsRouter.delete('/local/:name', (req: Request, res: Response) => {
  initProjectSpecPath(req);
  const name = String(req.params.name);
  const success = specManager.deleteSpec(name);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Spec not found or delete failed' });
  }

  res.json({ success: true });
});

specsRouter.post('/local/upload', (req: Request, res: Response) => {
  initProjectSpecPath(req);
  const { name, content } = req.body;

  if (!name || !content) {
    return res.status(400).json({ success: false, error: 'name and content are required' });
  }

  const success = specManager.saveSpec(name, content);
  if (!success) {
    return res.status(500).json({ success: false, error: 'Failed to save spec' });
  }

  res.json({ success: true });
});

specsRouter.get('/repositories', (req: Request, res: Response) => {
  const repos = specRepositoryService.getAllRepositories();
  res.json({
    success: true,
    data: repos.map(repo => ({
      ...repo,
      isSynced: specRepositoryService.isSynced(repo.id),
    })),
  });
});

specsRouter.post('/repositories', (req: Request, res: Response) => {
  const { name, url, type, repo_path } = req.body;

  if (!name || !url) {
    return res.status(400).json({ success: false, error: 'name and url are required' });
  }

  const repo = specRepositoryService.createRepository({ name, url, type, repo_path });
  res.json({ success: true, data: repo });
});

specsRouter.put('/repositories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, url, type, repo_path } = req.body;

  const success = specRepositoryService.updateRepository(id, { name, url, type, repo_path });
  if (!success) {
    return res.status(404).json({ success: false, error: 'Repository not found' });
  }

  res.json({ success: true });
});

specsRouter.delete('/repositories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;

  const success = specRepositoryService.deleteRepository(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Repository not found' });
  }

  res.json({ success: true });
});

specsRouter.get('/repositories/:id/specs', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!specRepositoryService.isSynced(id)) {
    return res.status(400).json({ success: false, error: 'Repository not synced. Please sync first.' });
  }

  const specs = await specRepositoryService.parseRepoSpecs(id);
  res.json({ success: true, data: specs });
});

specsRouter.post('/repositories/:id/sync', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await specRepositoryService.syncRepository(id);
  res.json(result);
});

specsRouter.post('/repositories/:id/download', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { specName, projectPath: bodyProjectPath } = req.body;
  const sessionProjectPath = getProjectPathFromRequest(req);
  const projectPath = bodyProjectPath || sessionProjectPath || getDefaultProjectPath();

  if (!specName) {
    return res.status(400).json({ success: false, error: 'specName is required' });
  }

  const success = await specRepositoryService.downloadSpec(id, specName, projectPath);
  if (!success) {
    return res.status(500).json({ success: false, error: 'Download failed' });
  }

  res.json({ success: true, data: { projectPath } });
});

specsRouter.post('/repositories/:id/download-all', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { projectPath: bodyProjectPath } = req.body;
  const sessionProjectPath = getProjectPathFromRequest(req);
  const projectPath = bodyProjectPath || sessionProjectPath || getDefaultProjectPath();

  const result = await specRepositoryService.downloadAll(id, projectPath);
  res.json({ success: result.success, data: { ...result, projectPath } });
});

specsRouter.get('/injection/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;

  const messages = memoryService.getAllMessages(sessionId);
  const messageCount = messages.length;

  const shouldInject = specInjector.shouldInject(messageCount);
  if (!shouldInject) {
    return res.json({ success: true, data: { inject: false } });
  }

  const injection = specInjector.buildSpecInjection();
  res.json({
    success: true,
    data: {
      inject: true,
      injection,
    },
  });
});

specsRouter.post('/inject', (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }

  const messages = sessionId ? memoryService.getAllMessages(sessionId) : [];
  const messageCount = messages.length;

  if (!specInjector.shouldInject(messageCount)) {
    return res.json({ success: true, data: { message } });
  }

  const injectedMessage = specInjector.injectIntoMessage(message);
  res.json({
    success: true,
    data: { message: injectedMessage },
  });
});
