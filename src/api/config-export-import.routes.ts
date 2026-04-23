/**
 * Config Export/Import API 路由
 * 
 * 路由列表：
 * - GET  /api/config/export   -> 导出配置
 * - POST /api/config/import   -> 导入配置
 */

import { Router, Request, Response } from 'express';
import yaml from 'js-yaml';
import { configExportImportService } from '../service/config-export-import.service.js';

export const configExportImportRouter = Router();

configExportImportRouter.get('/export', (req: Request, res: Response) => {
  try {
    const data = configExportImportService.exportAll();
    const yamlContent = yaml.dump(data, { skipInvalid: true });
    
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename=config.yml');
    res.send(yamlContent);
  } catch (error: any) {
    res.status(500).json({ success: false, error: '导出失败: ' + error.message });
  }
});

configExportImportRouter.post('/import', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: '请提供配置文件内容' });
    }

    let data;
    try {
      data = yaml.load(content);
    } catch (parseError: any) {
      return res.status(400).json({ success: false, error: 'YAML 格式解析失败: ' + parseError.message });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: '配置文件格式无效' });
    }

    const result = configExportImportService.importData(data);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ success: false, error: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: '导入失败: ' + error.message });
  }
});