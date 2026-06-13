import { Request, Response } from 'express';
import { skillsManager } from '../../../modules/skill/index.js';
import { sessionService } from '../../../modules/session/index.js';
import { projectService } from '../../../services/project/project.service.js';

function initProjectSkillsPath(req: Request): void {
  const sessionId = req.query.sessionId as string;
  const sessionPath = sessionId ? sessionService.get(sessionId)?.projectPath || null : null;
  skillsManager.setProjectPath(sessionPath || projectService.getCurrentProjectPath());
}

export async function GET(req: Request, res: Response) {
  initProjectSkillsPath(req);
  const skills = skillsManager.getLocalSkills();
  res.json({
    success: true,
    data: skills.map(s => ({ name: s.name, description: s.description, filePath: s.filePath })),
  });
}
