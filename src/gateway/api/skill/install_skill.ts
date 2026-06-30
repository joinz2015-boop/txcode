import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { txcodeHubService } from '../../../services/hub/txcode_hub.service.js';
import { projectService } from '../../../services/project/project.service.js';

export async function POST(req: Request, res: Response) {
  const { skillId, skillName } = req.body;

  if (!skillId || !skillName) {
    return res.status(400).json({ success: false, error: 'skillId 和 skillName 必填' });
  }

  try {
    const zipBuffer = await txcodeHubService.downloadSkillZip(Number(skillId));

    const projectPath = projectService.getCurrentProjectPath();
    const skillsDir = path.join(projectPath, '.txcode', 'skills', skillName);

    if (!fs.existsSync(path.dirname(skillsDir))) {
      fs.mkdirSync(path.dirname(skillsDir), { recursive: true });
    }

    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(skillsDir, true);

    res.json({ success: true, message: '安装成功' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '安装失败' });
  }
}
