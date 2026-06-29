import { Request, Response } from 'express';
import { skillsManager } from '../../../services/skill/index.js';
import { projectService } from '../../../services/project/project.service.js';

export async function GET(req: Request, res: Response) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ success: false, error: 'name 必填' });
  skillsManager.setProjectPath(projectService.getCurrentProjectPath());
  const localSkills = skillsManager.getLocalSkills();
  const skill = localSkills.find(s => s.name === name);
  if (!skill) return res.status(404).json({ success: false, error: 'Skill not found' });
  res.json({ success: true, data: skill.content });
}
