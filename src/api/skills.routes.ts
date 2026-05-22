/**
 * Skills API 路由
 * 按照 skill-guide.md 规范实现
 * 新增 remote/local 管理模式
 */

import { Router, Request, Response } from 'express';
import { skillsManager, skillHandler, buildAvailableSkillsPrompt, skillRepositoryService } from '../modules/skill/index.js';
import { sessionService } from '../modules/session/index.js';
import { projectService } from '../services/project/project.service.js';

export const skillsRouter = Router();

function getProjectPathFromRequest(req: Request): string | null {
  const sessionId = req.query.sessionId as string || req.body?.sessionId;
  if (sessionId) {
    const session = sessionService.get(sessionId);
    return session?.projectPath || null;
  }
  return null;
}

function getDefaultProjectPath(): string {
  return projectService.getCurrentProjectPath();
}

function initProjectSkillsPath(req: Request): void {
  const sessionPath = getProjectPathFromRequest(req);
  const projectPath = sessionPath || getDefaultProjectPath();
  skillsManager.setProjectPath(projectPath);
}

// ==================== 原有路由（兼容） ====================

skillsRouter.get('/', (req: Request, res: Response) => {
  initProjectSkillsPath(req);
  const skills = skillsManager.getLocalSkills();
  res.json({
    success: true,
    data: skills.map(s => ({
      name: s.name,
      description: s.description,
      filePath: s.filePath,
    })),
  });
});

skillsRouter.get('/prompt', (req: Request, res: Response) => {
  const prompt = buildAvailableSkillsPrompt();
  res.json({
    success: true,
    data: prompt,
  });
});

skillsRouter.get('/paths', (req: Request, res: Response) => {
  const paths = skillsManager.getSearchPaths();
  res.json({
    success: true,
    data: paths,
  });
});

skillsRouter.post('/load', async (req: Request, res: Response) => {
  await skillsManager.loadAll();
  const skills = skillsManager.getAllSkills();
  res.json({
    success: true,
    data: {
      count: skills.length,
      skills: skills.map(s => ({
        name: s.name,
        description: s.description,
        filePath: s.filePath,
      })),
    },
  });
});

// ==================== 仓库管理（CRUD + Sync） ====================

skillsRouter.get('/repositories', (req: Request, res: Response) => {
  const repos = skillRepositoryService.getAllRepositories();
  res.json({
    success: true,
    data: repos.map(repo => ({
      ...repo,
      isSynced: skillRepositoryService.isSynced(repo.id),
    })),
  });
});

skillsRouter.post('/repositories', (req: Request, res: Response) => {
  const { name, url, type, repo_path } = req.body;

  if (!name || !url) {
    return res.status(400).json({ success: false, error: 'name and url are required' });
  }

  const repo = skillRepositoryService.createRepository({ name, url, type, repo_path });
  res.json({ success: true, data: repo });
});

skillsRouter.put('/repositories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, url, type, repo_path } = req.body;

  const success = skillRepositoryService.updateRepository(id, { name, url, type, repo_path });
  if (!success) {
    return res.status(404).json({ success: false, error: 'Repository not found' });
  }

  res.json({ success: true });
});

skillsRouter.delete('/repositories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;

  const success = skillRepositoryService.deleteRepository(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Repository not found or cannot be deleted' });
  }

  res.json({ success: true });
});

skillsRouter.post('/repositories/:id/sync', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await skillRepositoryService.syncRepository(id);
  res.json(result);
});

// ==================== 远程技能 ====================

skillsRouter.get('/repositories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!skillRepositoryService.isSynced(id)) {
    return res.status(400).json({ success: false, error: 'Repository not synced. Please sync first.' });
  }

  const skills = skillRepositoryService.getRemoteSkills(id);
  res.json({ success: true, data: skills });
});

// ==================== 下载安装 ====================

skillsRouter.post('/repositories/:id/download', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { skillName, projectPath: bodyProjectPath } = req.body;
  const sessionProjectPath = getProjectPathFromRequest(req);
  const projectPath = bodyProjectPath || sessionProjectPath || getDefaultProjectPath();

  if (!skillName) {
    return res.status(400).json({ success: false, error: 'skillName is required' });
  }

  const success = await skillRepositoryService.downloadSkill(id, skillName, projectPath);
  if (!success) {
    return res.status(500).json({ success: false, error: 'Download failed' });
  }

  res.json({ success: true, data: { projectPath } });
});

skillsRouter.post('/repositories/:id/download-all', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { projectPath: bodyProjectPath } = req.body;
  const sessionProjectPath = getProjectPathFromRequest(req);
  const projectPath = bodyProjectPath || sessionProjectPath || getDefaultProjectPath();

  const result = await skillRepositoryService.downloadAll(id, projectPath);
  res.json({ success: result.success, data: { ...result, projectPath } });
});

// ==================== 本地技能 ====================

skillsRouter.get('/local', (req: Request, res: Response) => {
  initProjectSkillsPath(req);
  const localSkills = skillsManager.getLocalSkills();
  res.json({
    success: true,
    data: localSkills.map(s => ({
      name: s.name,
      description: s.description,
      filePath: s.filePath,
    })),
  });
});

skillsRouter.get('/local/:name', (req: Request, res: Response) => {
  initProjectSkillsPath(req);
  const name = String(req.params.name);
  const content = skillsManager.getSkillContent(name);

  if (content === null) {
    return res.status(404).json({ success: false, error: 'Skill not found' });
  }

  res.json({
    success: true,
    data: content,
  });
});

skillsRouter.delete('/local/:name', (req: Request, res: Response) => {
  initProjectSkillsPath(req);
  const name = String(req.params.name);
  const success = skillsManager.deleteLocalSkill(name);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Skill not found or delete failed' });
  }

  res.json({ success: true });
});

// ==================== 原有技能详情路由（保持兼容，放在最后避免路由冲突） ====================

skillsRouter.get('/:name', async (req: Request, res: Response) => {
  await skillsManager.loadAll();
  const name = String(req.params.name);
  const result = await skillHandler({ name });

  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: result.data });
});
