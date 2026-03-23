/**
 * Skills API 路由
 * 按照 skill-guide.md 规范实现
 */

import { Router, Request, Response } from 'express';
import { skillsManager, skillHandler, buildAvailableSkillsPrompt } from '../modules/skill/index.js';

export const skillsRouter = Router();

skillsRouter.get('/', async (req: Request, res: Response) => {
  await skillsManager.loadAll();
  const skills = skillsManager.getAvailableSkills();
  res.json({
    success: true,
    data: skills,
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

skillsRouter.get('/:name', async (req: Request, res: Response) => {
  await skillsManager.loadAll();
  const name = String(req.params.name);
  const result = await skillHandler({ name });

  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: result.data });
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
