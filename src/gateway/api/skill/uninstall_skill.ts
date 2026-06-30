import { Request, Response } from 'express';
import { skillsManager } from '../../../services/skill/index.js';
import { projectService } from '../../../services/project/project.service.js';

export async function POST(req: Request, res: Response) {
  const { skillName } = req.body;

  if (!skillName) {
    return res.status(400).json({ success: false, error: 'skillName 必填' });
  }

  try {
    skillsManager.setProjectPath(projectService.getCurrentProjectPath());
    const success = skillsManager.deleteLocalSkill(skillName);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Skill 不存在或删除失败' });
    }
    res.json({ success: true, message: '卸载成功' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '卸载失败' });
  }
}
