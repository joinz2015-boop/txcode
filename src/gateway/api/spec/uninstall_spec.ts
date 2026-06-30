import { Request, Response } from 'express';
import { specManager } from '../../../modules/spec/index.js';
import { projectService } from '../../../services/project/project.service.js';

export async function POST(req: Request, res: Response) {
  const { specName } = req.body;

  if (!specName) {
    return res.status(400).json({ success: false, error: 'specName 必填' });
  }

  try {
    specManager.setProjectPath(projectService.getCurrentProjectPath());
    const success = specManager.deleteSpec(specName);
    if (!success) {
      return res.status(404).json({ success: false, error: '规范不存在或删除失败' });
    }
    res.json({ success: true, message: '卸载成功' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '卸载失败' });
  }
}
