/**
 * OSS API 路由模块
 * 
 * 路由列表：
 * - GET    /api/oss/config           -> 获取OSS配置
 * - POST   /api/oss/config           -> 保存OSS配置
 * - POST   /api/oss/config/delete    -> 删除OSS配置
 * - POST   /api/oss/config/active    -> 设置激活配置
 * - GET    /api/oss/browse           -> 浏览OSS文件列表
 * - GET    /api/oss/download         -> 下载OSS文件
 * - POST   /api/oss/upload           -> 上传文件到OSS
 * - POST   /api/oss/delete           -> 删除OSS文件
 * - POST   /api/oss/rename           -> 重命名OSS文件/文件夹
 * - GET    /api/oss/download-url     -> 获取文件下载链接
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { ossService } from '../services/oss.service.js';
import { ossRepository } from '../repository/oss.repository.js';

export const ossRouter = Router();

function logError(msg: string, error: unknown): void {
  console.error(`[oss.routes] ${msg}:`, error);
}

ossRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = ossService.getConfig();
    const configs = ossService.getAllConfigs();
    
    if (config) {
      const { access_key_secret, ...publicConfig } = config;
      return res.json({
        success: true,
        data: {
          configs,
          active: { ...publicConfig, hasSecret: true }
        }
      });
    }
    
    return res.json({
      success: true,
      data: {
        configs,
        active: null
      }
    });
  } catch (error: unknown) {
    logError('获取OSS配置失败:', error);
    res.status(500).json({ success: false, error: '获取OSS配置失败' });
  }
});

ossRouter.post('/config', (req: Request, res: Response) => {
  try {
    const { name, endpoint, bucket, access_key_id, access_key_secret, region, id, is_active } = req.body;
    
    if (!name || !endpoint || !bucket || !access_key_id || !access_key_secret) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const config = ossService.saveConfig({
      id,
      name,
      endpoint,
      bucket,
      access_key_id,
      access_key_secret,
      region: region || 'cn-hangzhou',
      is_active
    });

    res.json({ success: true, data: config });
  } catch (error: unknown) {
    logError('保存OSS配置失败:', error);
    res.status(500).json({ success: false, error: '保存OSS配置失败' });
  }
});

ossRouter.post('/config/delete', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'id必填' });
    }

    ossService.deleteConfig(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: unknown) {
    logError('删除OSS配置失败:', error);
    res.status(500).json({ success: false, error: '删除OSS配置失败' });
  }
});

ossRouter.post('/config/active', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'id必填' });
    }

    ossService.setActiveConfig(id);
    res.json({ success: true, message: '设置成功' });
  } catch (error: unknown) {
    logError('设置激活配置失败:', error);
    res.status(500).json({ success: false, error: '设置激活配置失败' });
  }
});

ossRouter.get('/browse', async (req: Request, res: Response) => {
  try {
    const prefix = req.query.prefix as string || '';
    const result = await ossService.browse(prefix);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logError('浏览OSS失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

ossRouter.get('/download', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'key必填' });
    }

    const buffer = await ossService.download(key);
    const filename = key.split('/').pop() || 'download';

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: unknown) {
    logError('下载OSS文件失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

ossRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const { localPath, ossKey } = req.body;
    
    if (!localPath || !ossKey) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, error: '本地文件不存在' });
    }

    await ossService.upload(localPath, ossKey);
    res.json({ success: true, message: '上传成功' });
  } catch (error: unknown) {
    logError('上传文件到OSS失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

ossRouter.post('/delete', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'key必填' });
    }

    await ossService.delete(key);
    res.json({ success: true, message: '删除成功' });
  } catch (error: unknown) {
    logError('删除OSS文件失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

ossRouter.post('/rename', async (req: Request, res: Response) => {
  try {
    const { oldKey, newKey } = req.body;
    
    if (!oldKey || !newKey) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    await ossService.rename(oldKey, newKey);
    res.json({ success: true, message: '重命名成功' });
  } catch (error: unknown) {
    logError('重命名OSS文件失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

ossRouter.get('/download-url', (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    const expires = parseInt(req.query.expires as string) || 3600;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'key必填' });
    }

    const url = ossService.getDownloadUrl(key, expires);
    res.json({ success: true, data: { url } });
  } catch (error: unknown) {
    logError('获取下载链接失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});