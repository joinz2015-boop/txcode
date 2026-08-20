import { Request, Response } from 'express';
import { zihaoService } from '../../../services/zihao/zihao.service.js';

export async function POST(req: Request, res: Response) {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id必填' });
    }
    zihaoService.deleteConfig(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: unknown) {
    console.error('[delete_config_zihao] 删除配置失败:', error);
    res.status(500).json({ success: false, error: '删除梓豪配置失败' });
  }
}
