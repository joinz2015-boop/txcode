import { Request, Response } from 'express';
import { skillsManager } from '../../../modules/skill/index.js';

export async function POST(_req: Request, res: Response) {
  await skillsManager.loadAll();
  const skills = skillsManager.getAllSkills();
  res.json({
    success: true,
    data: {
      count: skills.length,
      skills: skills.map(s => ({ name: s.name, description: s.description, filePath: s.filePath })),
    },
  });
}
