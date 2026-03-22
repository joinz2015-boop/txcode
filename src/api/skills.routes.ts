/**
 * Skills API 路由
 */

import { Router, Request, Response } from 'express';
import { skillService } from '../modules/skill/index.js';
import { ApiResponse } from './api.types.js';

export const skillsRouter = Router();

skillsRouter.get('/', (req: Request, res: Response) => {
  const skills = skillService.getAll();
  res.json({
    success: true,
    data: skills.map(s => ({
      name: s.name,
      description: s.description,
      tools: s.tools,
    })),
  });
});

skillsRouter.get('/:name', (req: Request, res: Response) => {
  const name = String(req.params.name);
  const skill = skillService.get(name);
  
  if (!skill) {
    return res.status(404).json({ success: false, error: 'Skill not found' });
  }
  
  res.json({ success: true, data: skill });
});

skillsRouter.get('/search/:query', (req: Request, res: Response) => {
  const query = String(req.params.query);
  const skills = skillService.search(query);
  res.json({ success: true, data: skills });
});

skillsRouter.get('/:name/export', (req: Request, res: Response) => {
  const name = String(req.params.name);
  const yaml = skillService.exportToYaml(name);
  
  if (!yaml) {
    return res.status(404).json({ success: false, error: 'Skill not found' });
  }
  
  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml);
});