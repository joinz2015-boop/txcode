import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import multer from 'multer';
import { zihaoService } from '../services/zihao/zihao.service.js';

export const zihaoRouter = Router();

const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(os.tmpdir(), 'txcode-zihao-chunks');
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

function logError(msg: string, error: unknown): void {
  console.error(`[zihao.routes] ${msg}:`, error);
}

zihaoRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = zihaoService.getConfig();
    const configs = zihaoService.getAllConfigs();
    res.json({ success: true, data: { configs, active: config } });
  } catch (error: unknown) {
    logError('获取梓豪配置失败:', error);
    res.status(500).json({ success: false, error: '获取梓豪配置失败' });
  }
});

zihaoRouter.post('/config', (req: Request, res: Response) => {
  try {
    const { name, url, username, password, id, is_active } = req.body;
    if (!name || !url || !username || !password) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const config = zihaoService.saveConfig({ id, name, url, username, password, is_active });
    res.json({ success: true, data: { ...config, password: '' } });
  } catch (error: unknown) {
    logError('保存梓豪配置失败:', error);
    res.status(500).json({ success: false, error: '保存梓豪配置失败' });
  }
});

zihaoRouter.post('/config/delete', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id必填' });
    }
    zihaoService.deleteConfig(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: unknown) {
    logError('删除梓豪配置失败:', error);
    res.status(500).json({ success: false, error: '删除梓豪配置失败' });
  }
});

zihaoRouter.post('/config/active', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id必填' });
    }
    zihaoService.setActiveConfig(id);
    res.json({ success: true, message: '设置成功' });
  } catch (error: unknown) {
    logError('设置激活配置失败:', error);
    res.status(500).json({ success: false, error: '设置激活配置失败' });
  }
});

zihaoRouter.post('/connect', async (req: Request, res: Response) => {
  try {
    const result = await zihaoService.connect();
    res.json(result);
  } catch (error: unknown) {
    logError('连接梓豪失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.get('/browse', async (req: Request, res: Response) => {
  try {
    const remotePath = req.query.path as string || '/';
    const result = await zihaoService.browse(remotePath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logError('浏览梓豪目录失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.get('/view', async (req: Request, res: Response) => {
  try {
    const remotePath = req.query.path as string;
    if (!remotePath) {
      return res.status(400).json({ success: false, error: 'path必填' });
    }
    const result = await zihaoService.viewFile(remotePath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logError('查看文件失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, path: parentPath, type } = req.body;
    if (!name || !parentPath || !type) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const result = await zihaoService.create(name, parentPath, type);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logError('创建失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.post('/rename', async (req: Request, res: Response) => {
  try {
    const { oldPath, newName } = req.body;
    if (!oldPath || !newName) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const result = await zihaoService.rename(oldPath, newName);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logError('重命名失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.post('/delete', async (req: Request, res: Response) => {
  try {
    const { path: remotePath, type } = req.body;
    if (!remotePath || !type) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    await zihaoService.deleteFile(remotePath, type);
    res.json({ success: true, message: '删除成功' });
  } catch (error: unknown) {
    logError('删除失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.post('/save-content', async (req: Request, res: Response) => {
  try {
    const { path: remotePath, content } = req.body;
    if (!remotePath || content === undefined) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    await zihaoService.saveContent(remotePath, content);
    res.json({ success: true, message: '保存成功' });
  } catch (error: unknown) {
    logError('保存内容失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.get('/home-dir', async (req: Request, res: Response) => {
  try {
    const homeDir = await zihaoService.getHomeDir();
    res.json({ success: true, data: { home_dir: homeDir } });
  } catch (error: unknown) {
    logError('获取主目录失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.post('/chunk-upload', chunkUpload.single('chunk'), async (req: Request, res: Response) => {
  try {
    const { chunkIndex, totalChunks, fileName, targetDir } = req.body;
    const file = req.file;

    if (!file || !fileName) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const chunkBuffer = fs.readFileSync(file.path);

    try {
      const result = await zihaoService.chunkUpload(
        targetDir || '/',
        fileName,
        parseInt(chunkIndex as string, 10),
        parseInt(totalChunks as string, 10),
        chunkBuffer
      );

      if (result.file) {
        res.json({ success: true, data: result.file });
      } else {
        res.json({ success: true, data: { status: 'uploading', progress: result.progress, total: result.total } });
      }
    } finally {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  } catch (error: unknown) {
    logError('分片上传失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

zihaoRouter.get('/download', async (req: Request, res: Response) => {
  try {
    const remotePath = req.query.path as string;
    const localPath = req.query.localPath as string;

    if (!remotePath || !localPath) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const sendProgress = (progress: number) => {
      res.write(JSON.stringify({ progress }) + '\n');
    };

    sendProgress(0);
    await zihaoService.downloadStream(remotePath, localPath, sendProgress);
    res.write(JSON.stringify({ done: true }) + '\n');
    res.end();
  } catch (error: unknown) {
    logError('下载失败:', error);
    res.write(JSON.stringify({ success: false, error: (error as Error).message }) + '\n');
    res.end();
  }
});
