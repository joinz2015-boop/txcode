import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { txcodeHubService } from '../../../services/hub/txcode_hub.service.js';
import { projectService } from '../../../services/project/project.service.js';

export async function POST(req: Request, res: Response) {
  const { specId, specName } = req.body;

  if (!specId || !specName) {
    return res.status(400).json({ success: false, error: 'specId 和 specName 必填' });
  }

  try {
    const zipBuffer = await txcodeHubService.downloadSpecZip(Number(specId));

    const projectPath = projectService.getCurrentProjectPath();
    const specsDir = path.join(projectPath, '.txcode', 'specs', specName);

    if (!fs.existsSync(path.dirname(specsDir))) {
      fs.mkdirSync(path.dirname(specsDir), { recursive: true });
    }

    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(specsDir, true);

    res.json({ success: true, message: '安装成功' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '安装失败' });
  }
}
