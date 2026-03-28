/**
 * 终端 API 路由模块
 * 
 * 提供终端会话的 RESTful API 接口
 * 
 * 路由列表：
 * - GET    /api/terminal/sessions       -> 获取所有终端会话
 * - POST   /api/terminal/sessions       -> 创建新终端会话
 * - GET    /api/terminal/sessions/:id  -> 获取指定终端会话
 * - DELETE /api/terminal/sessions/:id  -> 删除终端会话
 */

import { Router, Request, Response } from 'express';
import { terminalService } from '../modules/terminal/terminal.service.js';

export const terminalRouter = Router();

/**
 * GET /api/terminal/status
 * 获取终端服务状态
 */
terminalRouter.get('/status', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    data: { 
      ptyAvailable: false,
      message: 'Using basic shell spawn'
    } 
  });
});

/**
 * GET /api/terminal/sessions
 * 获取所有终端会话列表
 */
terminalRouter.get('/sessions', (req: Request, res: Response) => {
  const sessions = terminalService.getAllSessions();
  res.json({ success: true, data: sessions });
});

/**
 * POST /api/terminal/sessions
 * 创建新终端会话
 */
terminalRouter.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { cols, rows, cwd } = req.body;
    const session = await terminalService.createSession({ cols, rows, cwd });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/terminal/sessions/:id
 * 获取指定终端会话
 */
terminalRouter.get('/sessions/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = terminalService.getSession(id);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Terminal session not found' });
  }
  
  res.json({ success: true, data: session });
});

/**
 * DELETE /api/terminal/sessions/:id
 * 删除终端会话
 */
terminalRouter.delete('/sessions/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  
  if (!terminalService.isSessionAlive(id)) {
    return res.status(404).json({ success: false, error: 'Terminal session not found' });
  }
  
  terminalService.deleteSession(id);
  res.json({ success: true });
});
