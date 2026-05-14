import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import multer from 'multer';
import { deployService } from '../modules/deploy/deploy.service.js';

export const deployRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(os.tmpdir(), 'txcode-deploy-uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

function getProjectPath(req: Request): string {
  const projectPath = (req.query.projectPath || req.body?.projectPath) as string;
  if (projectPath) return projectPath;
  try {
    const configPath = path.join(process.cwd(), '.txcode', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.currentProjectPath || process.cwd();
    }
  } catch { }
  return process.cwd();
}

deployRouter.get('/check-release', (req: Request, res: Response) => {
  try {
    const projectPath = getProjectPath(req);
    const result = deployService.checkReleaseMd(projectPath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[deploy.routes] check-release error:', error);
    res.status(500).json({ success: false, error: '检查部署文档失败' });
  }
});

deployRouter.post('/download-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'url必填' });
    }
    const projectPath = req.body.projectPath || getProjectPath(req);
    const result = await deployService.downloadFromUrl(url, projectPath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[deploy.routes] download-url error:', error);
    res.status(500).json({ success: false, error: '下载失败' });
  }
});

deployRouter.post('/upload-archive', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }
    const projectPath = req.body.projectPath || getProjectPath(req);
    const result = await deployService.uploadArchive(file.path, projectPath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[deploy.routes] upload-archive error:', error);
    res.status(500).json({ success: false, error: '上传解压失败' });
  }
});
