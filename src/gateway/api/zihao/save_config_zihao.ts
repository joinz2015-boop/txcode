import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { name, url, username, password, id, is_active } = req.body;
    if (!name || !url || !username || !password) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const config = zihaoService.saveConfig({ id, name, url, username, password, is_active });
    res.json({ success: true, data: { ...config, password: '' } });
  } catch (error: unknown) {
    console.error('[save_config_zihao] 保存配置失败:', error);
    res.status(500).json({ success: false, error: '保存梓豪配置失败' });
  }
}
