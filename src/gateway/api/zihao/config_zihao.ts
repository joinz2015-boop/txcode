import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function GET(req: Request, res: Response) {
  try {
    const config = zihaoService.getConfig();
    const configs = zihaoService.getAllConfigs();
    res.json({ success: true, data: { configs, active: config } });
  } catch (error: unknown) {
    console.error('[config_zihao] 获取配置失败:', error);
    res.status(500).json({ success: false, error: '获取梓豪配置失败' });
  }
}
