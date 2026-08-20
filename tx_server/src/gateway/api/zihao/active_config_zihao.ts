import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id必填' });
    }
    zihaoService.setActiveConfig(id);
    res.json({ success: true, message: '设置成功' });
  } catch (error: unknown) {
    console.error('[active_config_zihao] 设置激活配置失败:', error);
    res.status(500).json({ success: false, error: '设置激活配置失败' });
  }
}
